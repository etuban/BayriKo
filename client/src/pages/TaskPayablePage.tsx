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
            <p>This PDF Invoice is generated through <a href="https://bayriko.pawn.media" style="color: green; text-decoration: underline;">BayriKo</a></p>
            <div style="margin-top: 5px;">
              <a href="https://bayriko.pawn.media">
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
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Bill From:", 14, 64);
    const billFromLines = invoiceDetails.billFrom.split("\n");
    doc.setFontSize(9);
    billFromLines.forEach((line, index) => {
      doc.text(line, 14, 60 + index * 4);
    });

    doc.setFontSize(9);
    doc.text("Bill To:", 100, 64);
    const billToLines = invoiceDetails.billTo.split("\n");
    doc.setFontSize(9);
    billToLines.forEach((line, index) => {
      doc.text(line, 120, 60 + index * 4);
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

    // Add BayriKo logo from remote URL converted to base64 to avoid CORS issues
    const logoHeight = 15; // Height of the logo in mm
    const logoWidth = 45;  // Width of the logo in mm
    const logoY = footerY - 22; // Position logo above footer text
    const logoX = (docPageWidth - logoWidth) / 2; // Center the logo horizontally

    // Base64 encoded version of https://pawn.media/bayriko/logo.jpeg
    // This avoids CORS issues and ensures the image will always load
    const bayriko_logo_base64 = "data:image/jpeg;base64,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";
    
    try {
      // Add image with explicitly specified dimensions
      doc.addImage(
        bayriko_logo_base64, // Base64 encoded JPEG
        "JPEG",          // Format
        logoX,           // X position (mm)
        logoY,           // Y position (mm)
        logoWidth,       // Width (mm)
        logoHeight       // Height (mm)
      );
    } catch (error) {
      console.error("Error adding logo to PDF:", error);
      // Fallback to a text alternative if image loading fails
      doc.setTextColor(0, 128, 0); // Green text
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BayriKo", docPageWidth / 2, logoY + 8, { align: "center" });
    }
    
    // Add link annotation for the logo area
    const clickableArea = {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight
    };

    doc.link(
      clickableArea.x,
      clickableArea.y,
      clickableArea.width,
      clickableArea.height,
      {
        url: "https://bayriko.pawn.media",
      },
    );

    // Add website URL
    const websiteText = "https://bayriko.pawn.media";
    const websiteY = footerY + 5;
    doc.setFontSize(8);
    doc.setTextColor(0, 128, 0); // Green color for URL
    const websiteWidth = doc.getTextWidth(websiteText);
    const websiteX = (docPageWidth - websiteWidth) / 2;
    doc.text(websiteText, websiteX, websiteY);

    // Add a link annotation for the URL text
    doc.link(websiteX, websiteY - 3, websiteWidth, 4, {
      url: "https://bayriko.pawn.media",
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
