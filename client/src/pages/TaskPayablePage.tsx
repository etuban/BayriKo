import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PayableTaskTable } from '@/components/PayableTaskTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderKanban, Printer, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Task, InvoiceDetails } from '@/types';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TaskPayablePage() {
  // State for filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  
  // State for invoice details
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    billFrom: '',
    billTo: '',
    paymentTerms: ''
  });
  
  // Component ref for printing
  const componentRef = React.useRef<HTMLDivElement>(null);
  
  // Fetch payable tasks with filters
  const { data, isLoading, error } = useQuery<{tasks: Task[], grandTotal: number}>({
    queryKey: ['/api/tasks/payable/report', startDate, endDate, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (projectId) params.append('projectId', projectId);
      
      const url = `/api/tasks/payable/report?${params.toString()}`;
      return fetch(url).then(res => res.json());
    },
  });
  
  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  // Print handler
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Invoice',
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          font-family: 'Inter', sans-serif;
        }
        .print-header {
          color: #00800 !important;
        }
        .bg-dark-surface, .bg-dark-bg {
          background-color: white !important;
        }
        .border-dark-border {
          border-color: #ddd !important;
        }
        .text-gray-400 {
          color: #666 !important;
        }
        th {
          background-color: #008000 !important;
          color: white !important;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2 !important;
        }
        tr {
          display: table-row !important;
        }
        .hidden {
          display: block !important;
        }
        .print\\:table-cell {
          display: table-cell !important;
        }
        .text-xs {
          font-size: 9px !important;
        }
        .text-sm {
          font-size: 10px !important;
        }
      }
    `,
  });
  
  // Download PDF handler
  const handleDownloadPDF = () => {
    if (!data) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(0, 128, 0); // Green color for the header
    doc.text('Invoice', 105, 20, { align: 'center' });
    
    // Add company logo space
    doc.setDrawColor(0, 128, 0); // Green border
    doc.setLineWidth(0.5);
    doc.rect(14, 30, 50, 15);
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 0);
    doc.text('Invoice', 39, 40, { align: 'center' });
    
    // Add invoice number and date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Invoice #: INV-${new Date().getTime().toString().slice(-6)}`, 195, 30, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 35, { align: 'right' });
    
    // Add billing info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Bill From:', 14, 55);
    const billFromLines = invoiceDetails.billFrom.split('\n');
    doc.setFontSize(8);
    billFromLines.forEach((line, index) => {
      doc.text(line, 14, 60 + (index * 4));
    });
    
    doc.setFontSize(10);
    doc.text('Bill To:', 120, 55);
    const billToLines = invoiceDetails.billTo.split('\n');
    doc.setFontSize(8);
    billToLines.forEach((line, index) => {
      doc.text(line, 120, 60 + (index * 4));
    });
    
    // Add filter info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date Range: ${startDate || 'All'} to ${endDate || 'All'}`, 14, 85);
    
    // Group tasks by project
    const tasksByProject: Record<number, {
      projectName: string;
      tasks: Task[];
      subtotal: number;
    }> = {};
    
    data.tasks.forEach(task => {
      const projectId = task.projectId;
      if (!tasksByProject[projectId]) {
        tasksByProject[projectId] = {
          projectName: task.project?.name || 'Unknown Project',
          tasks: [],
          subtotal: 0
        };
      }
      
      tasksByProject[projectId].tasks.push(task);
      tasksByProject[projectId].subtotal += (task.totalAmount || 0);
    });
    
    // Create table content
    let startY = 90;
    
    // For each project
    Object.entries(tasksByProject).forEach(([projectId, project], index) => {
      // Project header row
      doc.setFillColor(240, 240, 240);
      doc.setDrawColor(220, 220, 220);
      doc.rect(14, startY, 182, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(project.projectName, 16, startY + 5);
      doc.text(`₱${project.subtotal.toFixed(2)}`, 194, startY + 5, { align: 'right' });
      startY += 10;
      
      // Tasks table headers
      const tableColumn = ["Task", "Date", "Hours", "Rate", "Total"];
      
      // Tasks rows
      const tableRows = project.tasks.map(task => {
        // Format dates safely
        let dateStr = '';
        if (task.startDate) {
          const startDate = new Date(task.startDate);
          dateStr = startDate.toLocaleDateString();
          
          if (task.endDate && task.startDate !== task.endDate) {
            const endDate = new Date(task.endDate);
            dateStr += ` - ${endDate.toLocaleDateString()}`;
          }
        }
        
        return [
          task.title || '',
          dateStr,
          typeof task.hours === 'number' ? task.hours.toFixed(2) : (task.hours || ''),
          task.pricingType === 'hourly' 
            ? `₱${((task.hourlyRate || 0) / 100).toFixed(2)}/hr` 
            : 'Fixed',
          `₱${(task.totalAmount || 0).toFixed(2)}`
        ];
      });
      
      // Add the table for this project
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        styles: { 
          cellPadding: 2,
          fontSize: 8,
          lineColor: [220, 220, 220],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [0, 128, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 45 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 27, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' }
        }
      });
      
      // Update startY for next project
      startY = (doc as any).lastAutoTable.finalY + 10;
    });
    
    // Get the final position
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
    
    // Add grand total
    doc.setFillColor(230, 250, 230);
    doc.rect(110, finalY + 2, 86, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('Grand Total:', 112, finalY + 7.5);
    doc.text(`₱${data.grandTotal.toFixed(2)}`, 194, finalY + 7.5, { align: 'right' });
    
    // Add payment terms
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Payment Terms:', 14, finalY + 20);
    const paymentTermsLines = invoiceDetails.paymentTerms.split('\n');
    doc.setFontSize(8);
    paymentTermsLines.forEach((line, index) => {
      doc.text(line, 14, finalY + 25 + (index * 4));
    });
    
    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Task Invoice`, 105, 287, { align: 'center' });
    }
    
    doc.save('Invoice.pdf');
  };
  
  // Handle invoice details change
  const handleDetailsChange = (field: keyof InvoiceDetails, value: string) => {
    setInvoiceDetails(prev => ({ ...prev, [field]: value }));
  };
  
  // Apply filters
  const applyFilters = () => {
    // Trigger refetch by updating query key
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">Task Payable</h1>
        
        {/* Payable Filters */}
        <div className="flex flex-wrap gap-3 items-center">
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
            <Select
              value={projectId}
              onValueChange={setProjectId}
            >
              <SelectTrigger className="pl-10 pr-8 py-2 min-w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project: any) => (
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
            <h1 className="text-xl font-bold text-center text-primary print-header">Invoice</h1>
            <div className="flex justify-between mt-4">
              <div className="border-2 border-primary p-2 text-center w-40">
                <p className="font-semibold text-primary">Invoice</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Invoice #: INV-{new Date().getTime().toString().slice(-6)}</p>
                <p className="text-xs text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Bill From</h3>
              <Textarea 
                rows={4} 
                className="w-full p-3 rounded-md bg-card border border-input text-sm" 
                placeholder="Your company details..."
                value={invoiceDetails.billFrom}
                onChange={(e) => handleDetailsChange('billFrom', e.target.value)}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Bill To</h3>
              <Textarea 
                rows={4} 
                className="w-full p-3 rounded-md bg-card border border-input text-sm" 
                placeholder="Client details..."
                value={invoiceDetails.billTo}
                onChange={(e) => handleDetailsChange('billTo', e.target.value)}
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
              onChange={(e) => handleDetailsChange('paymentTerms', e.target.value)}
            />
          </div>
          
          <div className="print:block hidden mt-4 text-sm text-muted-foreground">
            <p>Date Range: {startDate || 'All'} to {endDate || 'All'}</p>
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
            <p className="text-red-400">Error loading payable tasks. Please try again.</p>
          </div>
        ) : data && data.tasks.length > 0 ? (
          <PayableTaskTable data={data} />
        ) : (
          <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
            <p className="text-gray-400">No payable tasks found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
      
      {/* Invoice Actions */}
      <div className="flex justify-end space-x-3">
        <Button 
          variant="secondary" 
          className="flex items-center"
          onClick={handlePrint}
          disabled={!data || data.tasks.length === 0}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
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
