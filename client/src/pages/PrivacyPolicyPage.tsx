import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-gray-500 mt-2">Last updated: April 27, 2025</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Introduction</h2>
          <p>
            At BayriKo, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our task management application. Please read this policy carefully to understand our practices regarding your personal data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <p>We collect information that you provide directly to us when you:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Create an account (name, email, password)</li>
            <li>Complete your profile (position, avatar)</li>
            <li>Create and manage tasks, projects, and organizations</li>
            <li>Communicate with other users through the platform</li>
            <li>Contact our support team</li>
          </ul>
          
          <p className="mt-4">We also automatically collect certain information when you use our platform:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Usage data (features used, actions taken)</li>
            <li>Device information (IP address, browser type, operating system)</li>
            <li>Log data (access times, pages viewed)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process and complete transactions</li>
            <li>Send administrative information, including updates and security alerts</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Personalize your experience</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect, prevent, and address technical issues</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Sharing Your Information</h2>
          <p>We may share your information in the following situations:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>With Your Organization:</strong> Information you provide will be shared with other members of your organization as necessary for collaboration.</li>
            <li><strong>Service Providers:</strong> We may share information with third-party vendors who provide services on our behalf.</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in response to valid requests from public authorities.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            <li><strong>With Your Consent:</strong> We may share information with your consent or at your direction.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, so we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Rights</h2>
          <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access to your personal information</li>
            <li>Correction of inaccurate or incomplete information</li>
            <li>Deletion of your personal information</li>
            <li>Restriction of processing</li>
            <li>Data portability</li>
            <li>Objection to processing</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us using the information provided in the "Contact Us" section.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, analyze usage, and improve our services. You can control cookies through your browser settings and other tools.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Children's Privacy</h2>
          <p>
            Our services are not intended for individuals under the age of 16. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last updated" date. We encourage you to review this Privacy Policy periodically.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="font-medium">Email: pawnmedia.ph@gmail.com</p>
        </section>
      </div>
    </div>
  );
}