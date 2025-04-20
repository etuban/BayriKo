import React, { useState } from 'react';
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
import 'jspdf-autotable';

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
    documentTitle: 'MyByd_Invoice',
  });
  
  // Download PDF handler
  const handleDownloadPDF = () => {
    if (!data) return;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('MyByd Invoice', 105, 20, { align: 'center' });
    
    // Add billing info
    doc.setFontSize(12);
    doc.text('Bill From:', 14, 40);
    const billFromLines = invoiceDetails.billFrom.split('\n');
    billFromLines.forEach((line, index) => {
      doc.text(line, 14, 50 + (index * 7));
    });
    
    doc.text('Bill To:', 120, 40);
    const billToLines = invoiceDetails.billTo.split('\n');
    billToLines.forEach((line, index) => {
      doc.text(line, 120, 50 + (index * 7));
    });
    
    // Add filter info
    doc.text(`Date Range: ${startDate || 'All'} to ${endDate || 'All'}`, 14, 90);
    
    // Add tasks table
    const tableColumn = ["Task", "Project", "Hours", "Rate", "Total"];
    const tableRows = data.tasks.map(task => [
      task.title,
      task.project?.name || 'N/A',
      typeof task.hours === 'string' ? task.hours : task.hours?.toFixed(2) || 0,
      task.pricingType === 'hourly' 
        ? `$${(task.hourlyRate || 0) / 100}/hr` 
        : 'Fixed',
      `$${task.totalAmount?.toFixed(2) || 0}`
    ]);
    
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: 'grid',
      styles: { cellPadding: 2, fontSize: 10 },
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    // Add grand total
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.text(`Grand Total: $${data.grandTotal.toFixed(2)}`, 150, finalY + 15, { align: 'right' });
    
    // Add payment terms
    doc.text('Payment Terms:', 14, finalY + 30);
    const paymentTermsLines = invoiceDetails.paymentTerms.split('\n');
    paymentTermsLines.forEach((line, index) => {
      doc.text(line, 14, finalY + 40 + (index * 7));
    });
    
    doc.save('MyByd_Invoice.pdf');
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
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Bill From</h3>
              <Textarea 
                rows={4} 
                className="w-full p-3 rounded-md bg-dark-bg border border-dark-border text-sm" 
                placeholder="Your company details..."
                value={invoiceDetails.billFrom}
                onChange={(e) => handleDetailsChange('billFrom', e.target.value)}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Bill To</h3>
              <Textarea 
                rows={4} 
                className="w-full p-3 rounded-md bg-dark-bg border border-dark-border text-sm" 
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
              className="w-full p-3 rounded-md bg-dark-bg border border-dark-border text-sm" 
              placeholder="Payment terms and conditions..."
              value={invoiceDetails.paymentTerms}
              onChange={(e) => handleDetailsChange('paymentTerms', e.target.value)}
            />
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
