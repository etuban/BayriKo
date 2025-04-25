import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { 
  FolderKanban, 
  Printer, 
  Download, 
  Building, 
  Mail,
  X,
  Loader2
} from "lucide-react";
import { GiReceiveMoney } from "react-icons/gi";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, InvoiceDetails, Organization, Project } from "@/types";
import { useReactToPrint } from "react-to-print";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function TaskPayablePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("all-projects");
  const [selectedOrganization, setSelectedOrganization] = useState<
    number | null
  >(null);

  // State for invoice details
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    fromOrgName: "",
    fromName: "",
    fromEmail: "",
    fromContact: "",
    toOrgName: "",
    toName: "",
    toEmail: "",
    toContact: "",
    paymentTerms: "",
    footerHtml: "",
    billFrom: "",
    billTo: "",
  });
  
  // State for email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);

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
  
  // Populate invoice details with user and organization data
  useEffect(() => {
    if (user && currentOrganization) {
      setInvoiceDetails(prev => {
        const updated = {
          ...prev,
          fromOrgName: currentOrganization.name || "",
          fromName: user.fullName || "",
          fromEmail: user.email || "",
          fromContact: "",  // Default empty as we don't have this in user profile
          // Set legacy fields for backward compatibility
          billFrom: `${currentOrganization.name || ""}\n${user.fullName || ""}\n${user.email || ""}`,
          billTo: prev.billTo || "",
        };
        return updated;
      });
    }
  }, [user, currentOrganization]);

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

  // Update email message when data changes
  useEffect(() => {
    if (user && currentOrganization && data) {
      setEmailMessage(
        `Dear ${invoiceDetails.toName || "Recipient"},\n\n` +
        `Please find attached the invoice for tasks completed by ${currentOrganization.name}.\n\n` +
        `The total amount due is ${data.grandTotal ? formatCurrency(data.grandTotal, "PHP") : ""}.` +
        `\n\nPayment Terms:\n${invoiceDetails.paymentTerms || "Please process payment within 15 days of receipt."}` +
        `\n\nIf you have any questions, please don't hesitate to contact me.` +
        `\n\nBest regards,\n${user.fullName}`
      );
    }
  }, [user, currentOrganization, data, invoiceDetails.toName, invoiceDetails.paymentTerms]);
  
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

  // Generate PDF helper function that can be used by both download and email
  const generatePDF = (doc: jsPDF): jsPDF => {
    if (!data) return doc;

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
    const billFromText = invoiceDetails.billFrom || 
      `${invoiceDetails.fromOrgName || ""}\n${invoiceDetails.fromName || ""}\n${invoiceDetails.fromEmail || ""}\n${invoiceDetails.fromContact || ""}`;
    const billFromLines = billFromText.split("\n");
    doc.setFontSize(9);
    billFromLines.forEach((line, index) => {
      doc.text(line, 16, 67 + index * 4);
    });

    doc.setFontSize(10);
    doc.text("Bill To:", 100, 62);
    const billToText = invoiceDetails.billTo || 
      `${invoiceDetails.toOrgName || ""}\n${invoiceDetails.toName || ""}\n${invoiceDetails.toEmail || ""}\n${invoiceDetails.toContact || ""}`;
    const billToLines = billToText.split("\n");
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

    // Sort tasks by date (oldest first) before grouping
    const sortedTasks = [...data.tasks].sort((a, b) => {
      // Use startDate for comparison if available
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 
                  a.dueDate ? new Date(a.dueDate).getTime() : 
                  new Date(a.createdAt).getTime();
      
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 
                  b.dueDate ? new Date(b.dueDate).getTime() : 
                  new Date(b.createdAt).getTime();
      
      return dateA - dateB; // Ascending order (oldest first)
    });

    sortedTasks.forEach((task) => {
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

            // No need to re-draw the background, but if we wanted to we would:
            // doc.setFillColor(...fillColor);
            // doc.rect(x, y, width, height, "F");

            // Now, we draw each line with different styling
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);

            // Draw title in bold (first line)
            const titleText = text[0];
            doc.text(titleText, x + 2, y + 5);

            // Draw description in normal text (remaining lines)
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);

            for (let i = 1; i < text.length; i++) {
              doc.text(text[i], x + 2, y + 5 + i * 4);
            }
          }
        },
      });

      // Move the Y position down based on the height of the last added table
      startY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Add grand total
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 0);
    doc.setFont("helvetica", "bold");
    doc.text(
      `GRAND TOTAL: ${formatCurrency(data.grandTotal || 0, "PHP")}`,
      195,
      startY,
      { align: "right" },
    );

    // Add payment terms at the bottom if specified
    if (invoiceDetails.paymentTerms) {
      startY += 14;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Terms:", 14, startY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(invoiceDetails.paymentTerms, 16, startY + 5);
    }

    // Add footer on last page
    startY = doc.internal.pageSize.height - 25;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const footerText = "Generated with BayriKo Task Management System";
    doc.text(footerText, 105, startY, { align: "center" });
    doc.text("https://bayriko.pawn.media", 105, startY + 4, { align: "center" });

    return doc;
  };

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

    generatePDF(doc);

    // Get filename based on current organization and date
    let filename = "Invoice";
    if (currentOrganization?.name) {
      filename = `${currentOrganization.name.replace(/[^a-zA-Z0-9]/g, "_")}_Invoice`;
    }
    
    if (projectId && projectId !== "all-projects") {
      const project = projects.find(p => p.id.toString() === projectId);
      if (project) {
        filename += `_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      }
    }
    
    filename += `_${new Date().toISOString().slice(0, 10)}.pdf`;

    doc.save(filename);
  };

  // Send Email handler
  const handleSendEmail = async () => {
    if (!data || !invoiceDetails.toEmail) {
      toast({
        title: "Missing information",
        description: "Please provide a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    setEmailSending(true);

    try {
      // Generate PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      generatePDF(doc);

      // Convert PDF to base64
      const pdfBase64 = doc.output('datauristring');
      
      // Send API request
      const response = await apiRequest('POST', '/api/email/send-invoice', {
        from: {
          name: invoiceDetails.fromName,
          email: invoiceDetails.fromEmail
        },
        to: {
          name: invoiceDetails.toName,
          email: invoiceDetails.toEmail
        },
        subject: `Invoice from ${invoiceDetails.fromOrgName || currentOrganization?.name || ""}`,
        message: emailMessage,
        pdfData: pdfBase64
      });

      if (response.ok) {
        toast({
          title: "Email sent",
          description: "Invoice has been sent successfully.",
        });
        setEmailDialogOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while sending the email.",
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const applyFilters = () => {
    // Filters are automatically applied via the query parameters
    toast({
      title: "Filters applied",
      description: "Showing invoice data with current filters.",
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
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="absolute left-3 top-2.5 text-gray-400">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>

          {/* Apply Button */}
          <Button
            variant="outline"
            className="h-10"
            onClick={applyFilters}
          >
            Apply
          </Button>
        </div>
      </div>

      {/* Invoice Preview Card */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div ref={componentRef}>
          {isLoading ? (
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 space-y-4">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-1/3 mb-4" />
            </div>
          ) : error ? (
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
              <p className="text-red-500">
                Error loading invoice data. Please try again.
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
      </div>

      {/* Invoice Settings */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Invoice Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bill From Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Bill From</h3>
            
            <div>
              <Label htmlFor="from-org-name">Organization Name</Label>
              <Input 
                id="from-org-name" 
                value={invoiceDetails.fromOrgName}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, fromOrgName: e.target.value})}
                placeholder="Your organization"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="from-name">Your Name</Label>
              <Input 
                id="from-name" 
                value={invoiceDetails.fromName}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, fromName: e.target.value})}
                placeholder="Your full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="from-email">Email</Label>
              <Input 
                id="from-email" 
                type="email"
                value={invoiceDetails.fromEmail}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, fromEmail: e.target.value})}
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="from-contact">Contact Number</Label>
              <Input 
                id="from-contact" 
                value={invoiceDetails.fromContact}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, fromContact: e.target.value})}
                placeholder="Your contact number"
                className="mt-1"
              />
            </div>
          </div>
          
          {/* Bill To Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Bill To</h3>
            
            <div>
              <Label htmlFor="to-org-name">Organization Name</Label>
              <Input 
                id="to-org-name" 
                value={invoiceDetails.toOrgName || ""}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, toOrgName: e.target.value})}
                placeholder="Client organization"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="to-name">Recipient Name</Label>
              <Input 
                id="to-name" 
                value={invoiceDetails.toName || ""}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, toName: e.target.value})}
                placeholder="Client name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="to-email">Email</Label>
              <Input 
                id="to-email" 
                type="email"
                value={invoiceDetails.toEmail || ""}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, toEmail: e.target.value})}
                placeholder="client@example.com"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="to-contact">Contact Number</Label>
              <Input 
                id="to-contact" 
                value={invoiceDetails.toContact || ""}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, toContact: e.target.value})}
                placeholder="Client contact number"
                className="mt-1"
              />
            </div>
          </div>
        </div>
        
        {/* Payment Terms */}
        <div className="mt-6">
          <Label htmlFor="payment-terms">Payment Terms</Label>
          <Textarea 
            id="payment-terms" 
            value={invoiceDetails.paymentTerms || ""}
            onChange={(e) => setInvoiceDetails({...invoiceDetails, paymentTerms: e.target.value})}
            placeholder="Payment is due within 15 days of receipt."
            className="mt-1"
          />
        </div>
      </div>

      {/* Invoice Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={print}
          disabled={!data || data.tasks.length === 0}
          className="flex items-center"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={!data || data.tasks.length === 0}
          className="flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90 text-white flex items-center"
          onClick={() => setEmailDialogOpen(true)}
          disabled={!data || data.tasks.length === 0}
        >
          <Mail className="w-4 h-4 mr-2" />
          Email Invoice
        </Button>
      </div>
      
      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Send Invoice by Email</DialogTitle>
            <DialogDescription>
              Fill in the details below to send the invoice via email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-from-name">From Name</Label>
                <Input 
                  id="email-from-name" 
                  value={invoiceDetails.fromName}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, fromName: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="email-from-email">From Email</Label>
                <Input 
                  id="email-from-email" 
                  type="email"
                  value={invoiceDetails.fromEmail}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, fromEmail: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-to-name">Recipient Name</Label>
                <Input 
                  id="email-to-name" 
                  value={invoiceDetails.toName || ""}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, toName: e.target.value})}
                  placeholder="Recipient's name"
                />
              </div>
              
              <div>
                <Label htmlFor="email-to-email">Recipient Email</Label>
                <Input 
                  id="email-to-email" 
                  type="email"
                  value={invoiceDetails.toEmail || ""}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, toEmail: e.target.value})}
                  placeholder="recipient@example.com"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mt-4">
            <Label htmlFor="email-message">Email Message</Label>
            <Textarea 
              id="email-message" 
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={6}
              className="min-h-[120px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={emailSending || !invoiceDetails.toEmail}
              className="ml-2"
            >
              {emailSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}