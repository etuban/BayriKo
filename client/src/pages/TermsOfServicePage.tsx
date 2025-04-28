import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfServicePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="flex items-center" 
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-gray-500 mt-2">Last updated: April 27, 2025</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Introduction</h2>
          <p>
            Welcome to BayriKo. These Terms of Service ("Terms") govern your access to and use of our task management application and services. By accessing or using BayriKo, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Definitions</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>"BayriKo," "we," "us,"</strong> and <strong>"our"</strong> refer to BayriKo and its parent company, Pawn Media.</li>
            <li><strong>"Service"</strong> or <strong>"Services"</strong> refers to the BayriKo task management application, website, and related services.</li>
            <li><strong>"User," "you,"</strong> and <strong>"your"</strong> refer to the individual or entity accessing or using the Services.</li>
            <li><strong>"Content"</strong> refers to all text, data, information, images, and other materials uploaded, downloaded, or appearing on the Services.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Account Registration</h2>
          <p>To use certain features of the Services, you must register for an account. When registering, you must provide accurate and complete information. You are solely responsible for:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use or security breach</li>
          </ul>
          <p className="mt-4">
            We reserve the right to suspend or terminate accounts that violate these Terms or for any other reason at our sole discretion.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use the Services in any way that violates applicable laws or regulations</li>
            <li>Impersonate any person or entity</li>
            <li>Upload or transmit viruses, malware, or other malicious code</li>
            <li>Attempt to gain unauthorized access to any part of the Services</li>
            <li>Interfere with or disrupt the Services or servers or networks connected to the Services</li>
            <li>Harvest or collect user data without consent</li>
            <li>Use the Services for any illegal or unauthorized purpose</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Content</h2>
          <p>
            You retain all rights to Content you submit, post, or display on or through the Services. By submitting Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, transmit, and display such Content for the purpose of providing and improving the Services.
          </p>
          <p className="mt-4">
            You are solely responsible for Content you submit and its legality, reliability, and appropriateness. We do not endorse, support, represent, or guarantee the completeness, truthfulness, accuracy, or reliability of any Content.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Intellectual Property</h2>
          <p>
            The Services and their original content, features, and functionality are owned by BayriKo and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>
          <p className="mt-4">
            You may not copy, modify, create derivative works, publicly display, publicly perform, republish, download, store, or transmit any materials from our Services without our written consent, except as provided in these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Third-Party Services</h2>
          <p>
            Our Services may contain links to third-party websites or services that are not owned or controlled by BayriKo. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that BayriKo shall not be responsible or liable for any damage or loss caused by your use of any third-party websites or services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
          <p>
            In no event shall BayriKo, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Your access to or use of or inability to access or use the Services</li>
            <li>Any conduct or content of any third party on the Services</li>
            <li>Any content obtained from the Services</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Disclaimer</h2>
          <p>
            Your use of the Services is at your sole risk. The Services are provided on an "AS IS" and "AS AVAILABLE" basis. BayriKo expressly disclaims all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time at our sole discretion. We will provide notice of changes by posting the updated Terms on this page with a new "Last updated" date. Your continued use of the Services after any such changes constitutes your acceptance of the new Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the Philippines, without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="font-medium">Email: pawnmedia.ph@gmail.com</p>
        </section>
      </div>
    </div>
  );
}