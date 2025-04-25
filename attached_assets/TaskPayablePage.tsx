import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { PayableTaskTable } from "@/components/PayableTaskTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FolderKanban, Printer, Download, Building } from "lucide-react";
import { GiReceiveMoney } from "react-icons/gi";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, InvoiceDetails, Organization, Project } from "@/types";
import { useReactToPrint } from "react-to-print";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";

export default function TaskPayablePage() {
  const { user } = useAuth();

  // State for filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("all-projects");
  const [selectedOrganization, setSelectedOrganization] = useState<
    number | null
  >(null);

  // State for invoice details
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    billFrom: "",
    billTo: "",
    paymentTerms: "",
    footerHtml: "",
  });

  // Component ref for printing
  const componentRef = React.useRef<HTMLDivElement>(null);

  // Load user's organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/users/organizations/current"],
    enabled: !!user,
  });

  // Fetch current organization details
  const { data: currentOrganization } = useQuery<Organization>({
    queryKey: ["/api/organizations/current"],
    enabled: !!user?.currentOrganizationId,
  });

  // Set default organization based on user's current organization if available
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      // Use the user's current organization if available
      if (user?.currentOrganizationId) {
        setSelectedOrganization(user.currentOrganizationId);
      } else {
        // Otherwise use the first organization
        setSelectedOrganization(organizations[0]?.id || null);
      }
    }
  }, [organizations, user]);

  // Fetch projects for filter dropdown, filtered by organization
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", selectedOrganization],
    queryFn: async () => {
      let url = "/api/projects";
      if (selectedOrganization) {
        url += `?organizationId=${selectedOrganization}`;
      }
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!selectedOrganization,
  });

  // Fetch payable tasks with filters
  const { data, isLoading, error } = useQuery<{
    tasks: Task[];
    grandTotal: number;
  }>({
    queryKey: [
      "/api/tasks/payable/report",
      startDate,
      endDate,
      projectId,
      selectedOrganization,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (projectId && projectId !== "all-projects")
        params.append("projectId", projectId);
      if (selectedOrganization)
        params.append("organizationId", selectedOrganization.toString());

      const url = `/api/tasks/payable/report?${params.toString()}`;
      return fetch(url).then((res) => res.json());
    },
    enabled: !!selectedOrganization,
  });

  // Function to handle manual printing
  const print = () => {
    const contentToPrint = componentRef.current;
    if (!contentToPrint) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups for printing");
      return;
    }

    // Setup the print window
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: 'Inter', Arial, sans-serif;
            color: #333;
            line-height: 1.4;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .print-header {
            color: #008000;
            text-align: center;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .invoice-details {
            margin-bottom: 30px;
          }
          .info-block {
            margin-bottom: 20px;
          }
          .info-block h3 {
            font-size: 16px;
            margin-bottom: 5px;
          }
          .info-block p {
            font-size: 14px;
            margin: 0;
          }
          .project-header {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .right-align {
            text-align: right;
          }
          .center-align {
            text-align: center;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .grand-total {
            font-weight: bold;
            background-color: #e6f7e6;
            font-size: 14px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${contentToPrint.innerHTML}
          <div class="footer">
            <p>This PDF Invoice is generated through <a href="https://p4wn.shop/bayriko/" style="color: green; text-decoration: underline;">BayriKo</a></p>
            <div style="margin-top: 5px;">
              <a href="https://p4wn.shop/bayriko/">
                <div className="bg-primary p-2 rounded-md">
                 <GiReceiveMoney className="w-6 h-6 text-white" />
               </div>
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for everything to load then print
    printWindow.onload = function () {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = function () {
        printWindow.close();
      };
    };
  };

  // Direct PDF generation is used instead of react-to-print

  // Download PDF handler
  const handleDownloadPDF = () => {
    if (!data) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      floatPrecision: 16,
    });

    // Set default font to Helvetica for the whole document
    doc.setFont("helvetica", "normal");

    // Title position
    const titleY = 17;

    // Add title first
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0); // Green color for the header
    doc.setFont("helvetica", "bold");
    doc.text("Task Invoice", 108, titleY, { align: "center" });

    // Add organization name (left column) and invoice details (right column)
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);

    // Left side - Organization info with logo and name
    if (currentOrganization?.name) {
      // Position for organization info
      const orgLabelY = 34;
      const orgNameY = 54;

      // Add organization logo on the left if available, maintaining proportions
      if (currentOrganization?.logoUrl) {
        try {
          // Logo position to the left of organization name
          const logoHeight = 24; // max height in mm
          const logoX = 14; // Position left aligned
          const logoY = orgLabelY - 9; // Align with the organization label

          // Add image with preserved aspect ratio
          doc.addImage(
            currentOrganization.logoUrl, // URL or Base64 string
            "JPEG", // Format (JPEG/PNG/etc)
            logoX, // X position (mm) - left aligned
            logoY, // Y position (mm)
            0, // Width - 0 means calculate based on height
            logoHeight, // Height (mm)
          );

          // Shift the organization text to the right to accommodate the logo
          // Assuming logo has a width of about 1.5x its height
          const logoWidth = logoHeight * 1.5;
          const orgTextX = 14;
          //const orgTextX = logoX + logoWidth - 5; // 5mm margin after logo

          // Draw organization label and name with the adjusted X position
          //  doc.setFont("helvetica", "bold");
          //  doc.text("Organization:", orgTextX, orgLabelY);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(currentOrganization.name, orgTextX, orgNameY);
        } catch (error) {
          console.error("Error adding logo to PDF:", error);
          // Fallback to normal organization text without logo shift
          // doc.setFont("helvetica", "normal");
          // doc.text("Organization:", 18, orgLabelY);
          doc.setFont("helvetica", "normal");
          doc.text(currentOrganization.name, 20, orgNameY);
        }
      } else {
        // No logo, just add organization name
        // doc.setFont("helvetica", "bold");
        // doc.text("Organization:", 14, orgLabelY);
        doc.setFont("helvetica", "normal");
        doc.text(currentOrganization.name, 14, orgNameY);
      }
    }

    // Right side - Invoice number and date
    doc.text(
      `Invoice #: INV-${new Date().getTime().toString().slice(-6)}`,
      195,
      34,
      { align: "right" },
    );
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 40, {
      align: "right",
    });

    // Add billing info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Bill From:", 14, 62);
    const billFromLines = invoiceDetails.billFrom.split("\n");
    doc.setFontSize(9);
    billFromLines.forEach((line, index) => {
      doc.text(line, 16, 67 + index * 4);
    });

    doc.setFontSize(10);
    doc.text("Bill To:", 100, 62);
    const billToLines = invoiceDetails.billTo.split("\n");
    doc.setFontSize(9);
    billToLines.forEach((line, index) => {
      doc.text(line, 102, 67 + index * 4);
    });

    // Add filter info
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
      14,
      85,
    );

    // Group tasks by project
    const tasksByProject: Record<
      number,
      {
        projectName: string;
        tasks: Task[];
        subtotal: number;
      }
    > = {};

    data.tasks.forEach((task) => {
      const projectId = task.projectId;
      if (!tasksByProject[projectId]) {
        tasksByProject[projectId] = {
          projectName: task.project?.name || "Unknown Project",
          tasks: [],
          subtotal: 0,
        };
      }

      tasksByProject[projectId].tasks.push(task);
      tasksByProject[projectId].subtotal += task.totalAmount || 0;
    });

    // Create table content
    let startY = 90;

    // For each project
    Object.entries(tasksByProject).forEach(([projectId, project], index) => {
      // Project header row
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.rect(10, startY, 176, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(project.projectName, 14, startY + 5);
      /* doc.text(`Php ${project.subtotal.toFixed(2)}`, 194, startY + 5, {
        align: "right",
      }); */
      startY += 10;

      // Tasks table headers
      const tableColumn = ["Task", "Date", "Hours", "Rate", "Total"];

      // Tasks rows
      const tableRows = project.tasks.map((task) => {
        // Format dates safely
        let dateStr = "";
        if (task.startDate) {
          const startDate = new Date(task.startDate);
          dateStr = startDate.toLocaleDateString();

          if (task.endDate && task.startDate !== task.endDate) {
            const endDate = new Date(task.endDate);
            dateStr += ` - ${endDate.toLocaleDateString()}`;
          }
        }

        // Format title and description for display with bold title
        let taskTitle = "";

        if (task.title) {
          // We'll use styling in autoTable to make this bold
          taskTitle = task.title;
        }

        if (task.description) {
          // Add description as a separate line
          taskTitle += task.description ? `\n${task.description}` : "";
        }

        return [
          taskTitle,
          dateStr,
          typeof task.hours === "number"
            ? task.hours.toFixed(2)
            : task.hours || "",
          task.pricingType === "hourly"
            ? `${((task.hourlyRate || 0) / 100).toFixed(2)}/hr`
            : "Fixed",
          `${(task.totalAmount || 0).toFixed(2)}`,
        ];
      });

      // Add the table for this project
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: "grid",
        styles: {
          cellPadding: 2,
          fontSize: 8,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          overflow: "linebreak", // Wrap text instead of truncating
        },
        headStyles: {
          fillColor: [0, 128, 0], // Green header background
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          minCellHeight: 10,
          valign: "middle",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        // Setup pagination options
        pageBreak: "auto", // Enable automatic pagination
        showFoot: "lastPage", // Only show footer on the last page
        bodyStyles: {
          minCellHeight: 12, // Minimum height for cells
        },

        // Add header and footer for each page
        didDrawPage: function (data) {
          // If not the first page, add a small header with invoice title
          if (doc.getNumberOfPages() > 1) {
            // Add page number
            const pageNumber = doc.getNumberOfPages();
            const str = "Page " + pageNumber;

            // Position in the bottom right corner of the page
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height
              ? pageSize.height
              : pageSize.getHeight();
            const pageWidth = pageSize.width
              ? pageSize.width
              : pageSize.getWidth();

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(str, pageWidth - 20, pageHeight - 10);

            // Add small invoice title on subsequent pages
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text("Task Invoice", 14, 10);

            // Add organization name if available
            if (currentOrganization?.name) {
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.setFont("helvetica", "normal");
              doc.text(currentOrganization.name, 14, 15);
            }
          }
        },

        // Add custom cell styling for titles and descriptions
        didParseCell: function (data) {
          // Only style cells in the first column (task title/description)
          if (data.column.index === 0 && data.cell.text) {
            // If this is a cell in the first column with content
            if (Array.isArray(data.cell.text) && data.cell.text.length > 0) {
              // The first line is the title, set it to bold
              if (data.cell.text[0] !== "") {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fontSize = 9; // Making title slightly larger
              }

              // If there are multiple lines (description exists)
              if (data.cell.text.length > 1) {
                // We need to handle this with a custom didDrawCell function
                data.cell.styles.lineWidth = 0.1;
              }
            }
          }
        },
        // Custom draw cell function to handle title and description differently
        didDrawCell: function (data) {
          // Only process first column cells with multi-line text
          if (
            data.column.index === 0 &&
            data.cell.text &&
            Array.isArray(data.cell.text) &&
            data.cell.text.length > 1
          ) {
            const doc = data.doc;
            const text = data.cell.text;

            // Get cell position/dimensions
            const { x, y, width, height } = data.cell;

            // Apply the correct background color based on row index (alternate row styling)
            // Check if this is an alternate row using modulus operator
            const isAlternateRow = data.row.index % 2 === 1;
            const fillColor = isAlternateRow
              ? [245, 245, 245]
              : [255, 255, 255];

            // Clear the cell's existing content with the appropriate background color
            doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
            doc.rect(x, y, width, height, "F");

            // Draw title with bold and larger font
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(text[0], x + 2, y + 5);

            // Draw description with normal font and smaller size
            if (text.length > 1) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.text(text.slice(1).join("\n"), x + 2, y + 10);
            }

            // Return true to indicate we've handled the cell drawing
            return true;
          }
          return false; // Let jsPDF-AutoTable handle other cells
        },
        columnStyles: {
          0: { cellWidth: 112, cellPadding: 3 }, // Task title with increased padding for description
          1: { cellWidth: 18, halign: "right" }, // Date
          2: { cellWidth: 15, halign: "center" }, // Hours
          3: { cellWidth: 20, halign: "center" }, // Rate
          4: { cellWidth: 17, halign: "right" }, // Total
        },
        margin: { left: 14, right: 14, top: 20 }, // Increased top margin for headers
        tableWidth: 175,
      });

      // Update startY for next project
      startY = (doc as any).lastAutoTable.finalY + 10;
    });

    // Get the final position
    const finalY = (doc as any).lastAutoTable
      ? (doc as any).lastAutoTable.finalY
      : 120;

    // Add grand total
    doc.setFillColor(230, 250, 230);
    doc.rect(110, finalY + 2, 86, 8, "F");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "bold");
    doc.text("Grand Total:", 112, finalY + 7.5);
    doc.text(`P${data.grandTotal.toFixed(2)}`, 194, finalY + 7.5, {
      align: "right",
    });

    // Check if we have enough space for payment terms and footer
    // Get document dimensions
    const docPageSize = doc.internal.pageSize;
    const docPageHeight = docPageSize.height
      ? docPageSize.height
      : docPageSize.getHeight();
    const docPageWidth = docPageSize.width
      ? docPageSize.width
      : docPageSize.getWidth();

    // Calculate needed space for payment terms
    const paymentTermsHeight =
      invoiceDetails.paymentTerms.split("\n").length * 4 + 30; // 30 for header + margins

    // If there's not enough space for payment terms + footer (35mm), add a new page
    let updatedFinalY = finalY;
    if (finalY + paymentTermsHeight + 35 > docPageHeight) {
      doc.addPage();
      updatedFinalY = 20; // Reset to top of page with margin
    }

    // Get the current page after potential page addition
    const currentPage = doc.getNumberOfPages();
    doc.setPage(currentPage);

    // Add payment terms at the current position
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Payment Terms:", 14, updatedFinalY + 20);
    const paymentTermsLines = invoiceDetails.paymentTerms.split("\n");
    doc.setFontSize(8);
    paymentTermsLines.forEach((line, index) => {
      doc.text(line, 14, updatedFinalY + 25 + index * 4);
    });

    // Add static footer with link text
    const footerY = docPageHeight - 15;
    doc.setFontSize(9);

    // Add footer text with URL below the icon
    const footerText = "This PDF Invoice is generated through BayriKo";
    const textWidth = doc.getTextWidth(footerText);
    const textX = (docPageWidth - textWidth) / 2.05;
    doc.setTextColor(0, 0, 0); // Black text
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal"); // Helvetica is closest to Inter among standard fonts
    doc.text(footerText, textX, footerY);

    // No logo will be used in PDF footer (simplified approach)

    // Add website URL
    const websiteText = "https://p4wn.shop/bayriko/";
    const websiteY = footerY + 5;
    doc.setFontSize(8);
    doc.setTextColor(0, 128, 0); // Green color for URL
    const websiteWidth = doc.getTextWidth(websiteText);
    const websiteX = (docPageWidth - websiteWidth) / 2;
    doc.text(websiteText, websiteX, websiteY);

    // Add a link annotation for the URL text
    doc.link(websiteX, websiteY - 3, websiteWidth, 4, {
      url: "https://p4wn.shop/bayriko/",
    });

    // Create a dynamic filename based on the project name and timestamp
    const timestamp = new Date().getTime().toString().slice(-6);
    let filename = "Invoice_" + timestamp + ".pdf";

    // If there's a specific project selected in the filter, find the project name
    if (projectId && projectId !== "all") {
      // Find the project name in the projects list
      const selectedProject = (projects as any[]).find(
        (p) => p.id.toString() === projectId,
      );
      if (selectedProject) {
        const projectName = selectedProject.name
          .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace special characters with underscore
          .substring(0, 20); // Limit to 20 characters
        filename = projectName + "-" + filename;
      }
    }
    // Or if we have tasks from a project, use the first project's name
    else if (data.tasks.length > 0 && data.tasks[0].project) {
      const projectName = data.tasks[0].project.name
        .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace special characters with underscore
        .substring(0, 20); // Limit to 20 characters
      filename = projectName + "-" + filename;
    }
    // If no project is selected but organization data is available, use organization name
    else if (currentOrganization?.name) {
      const orgName = currentOrganization.name
        .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace special characters with underscore
        .substring(0, 20); // Limit to 20 characters
      filename = orgName + "-" + filename;
    }

    doc.save(filename);
  };

  // Handle invoice details change
  const handleDetailsChange = (field: keyof InvoiceDetails, value: string) => {
    setInvoiceDetails((prev) => ({ ...prev, [field]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    // Manually refetch the payable tasks with updated filters
    queryClient.invalidateQueries({
      queryKey: ["/api/tasks/payable/report"],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">PDF Invoice</h1>

        {/* Payable Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Organization Selector (visible to supervisors, team leads, and super admins) */}
          {organizations.length > 1 &&
            (user?.role === "super_admin" ||
              user?.role === "supervisor" ||
              user?.role === "team_lead") && (
              <div className="w-[200px]">
                <Select
                  value={selectedOrganization?.toString() || "no-organization"}
                  onValueChange={(value) =>
                    value !== "no-organization"
                      ? setSelectedOrganization(parseInt(value, 10))
                      : setSelectedOrganization(null)
                  }
                >
                  <SelectTrigger className="h-10 bg-dark-bg border-dark-border">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-primary" />
                      <SelectValue placeholder="Select organization" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              className="w-40"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              className="w-40"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Project Filter */}
          <div className="relative">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="pl-10 pr-8 py-2 min-w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-projects">All Projects</SelectItem>
                {projects &&
                  projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FolderKanban className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* Actions */}
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={applyFilters}
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Printable Area */}
      <div ref={componentRef}>
        {/* Invoice Details */}
        <div className="bg-background border border-border rounded-lg p-6 mb-6 print-section">
          {/* Invoice Title - Only visible when printing */}
          <div className="hidden print:block mb-6">
            {/* Task Invoice Title */}
            <h1 className="text-xl font-bold text-center text-primary print-header mb-4">
              Task Invoice
            </h1>

            {/* Organization Name and Invoice Details */}
            <div className="flex justify-between mt-4">
              {/* Left side - Organization info with logo */}
              {currentOrganization?.name && (
                <div className="text-left flex items-center">
                  {/* Organization Logo */}
                  {currentOrganization?.logoUrl && (
                    <div className="mr-3">
                      <img
                        src={currentOrganization.logoUrl}
                        alt={currentOrganization.name || "Organization logo"}
                        className="max-h-8 max-w-32"
                        style={{
                          objectFit: "contain",
                        }} /* Preserve aspect ratio */
                      />
                    </div>
                  )}

                  {/* Organization Name */}
                  <div>
                    <p className="text-xs font-medium text-gray-500"></p>
                    <p className="text-m text-gray-700">
                      {currentOrganization.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Right side - Invoice details */}
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Invoice #: INV-{new Date().getTime().toString().slice(-6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Date: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Bill From:</h3>
              <Textarea
                rows={4}
                className="w-full p-3 rounded-md bg-card border border-input text-sm"
                placeholder="Your company details..."
                value={invoiceDetails.billFrom}
                onChange={(e) =>
                  handleDetailsChange("billFrom", e.target.value)
                }
              />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Bill To:</h3>
              <Textarea
                rows={4}
                className="w-full p-3 rounded-md bg-card border border-input text-sm"
                placeholder="Client details..."
                value={invoiceDetails.billTo}
                onChange={(e) => handleDetailsChange("billTo", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Payment Terms</h3>
            <Textarea
              rows={2}
              className="w-full p-3 rounded-md bg-card border border-input text-sm"
              placeholder="Payment terms and conditions..."
              value={invoiceDetails.paymentTerms}
              onChange={(e) =>
                handleDetailsChange("paymentTerms", e.target.value)
              }
            />
          </div>

          <div className="print:block hidden mt-4 text-sm text-muted-foreground">
            <p>
              Date Range: {startDate || "All"} to {endDate || "All"}
            </p>
          </div>
        </div>

        {/* Payable Tasks Table */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
            <p className="text-red-400">
              Error loading payable tasks. Please try again.
            </p>
          </div>
        ) : data && data.tasks.length > 0 ? (
          <PayableTaskTable data={data} invoiceDetails={invoiceDetails} />
        ) : (
          <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
            <p className="text-gray-400">
              No payable tasks found. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>

      {/* Invoice Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          className="bg-primary hover:bg-primary/90 text-white flex items-center"
          onClick={handleDownloadPDF}
          disabled={!data || data.tasks.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}
