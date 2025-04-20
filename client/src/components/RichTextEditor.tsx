import React, { useState } from 'react';
import { Bold, Italic, AlignLeft, List, Image, Link, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  
  // Simple function to add formatting tags
  const addFormat = (tag: string) => {
    // Simple tag insertion - in a real app, this would be more sophisticated
    const updatedValue = `${value}<${tag}>${tag === 'img' ? 'image_url' : 'text'}</${tag}>`;
    onChange(updatedValue);
  };
  
  // Toggle preview mode
  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  return (
    <div className="border border-dark-border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="bg-dark-border px-3 py-1 border-b border-dark-border flex items-center space-x-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white" onClick={() => addFormat('b')}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white" onClick={() => addFormat('i')}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white" onClick={() => addFormat('ul')}>
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white" onClick={() => addFormat('a')}>
          <Link className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white" onClick={() => addFormat('img')}>
          <Image className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white" onClick={togglePreview}>
          {isPreview ? <AlignLeft className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Editor Area */}
      {isPreview ? (
        <div 
          className="w-full p-3 bg-dark-bg min-h-[100px] text-sm"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 bg-dark-bg border-none focus:outline-none focus:ring-0 min-h-[100px]"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
