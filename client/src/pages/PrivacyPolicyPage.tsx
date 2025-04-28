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
            BayriKo ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and use our services, and tell you about your privacy rights and how the law protects you.
          </p>
          <p>
            This privacy policy applies to all users of our task management platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:</p>

          <h3 className="text-xl font-medium mt-6">Identity Data</h3>
          <p>Includes first name, last name, username, password, or similar identifier.</p>

          <h3 className="text-xl font-medium mt-6">Contact Data</h3>
          <p>Includes email address, telephone numbers, and physical address.</p>

          <h3 className="text-xl font-medium mt-6">Technical Data</h3>
          <p>Includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access our website.</p>

          <h3 className="text-xl font-medium mt-6">Usage Data</h3>
          <p>Includes information about how you use our website and services, such as task creation, project management activities, and user interactions.</p>

          <h3 className="text-xl font-medium mt-6">Organization Data</h3>
          <p>Includes information about your organization, projects, and team members that you provide to us when using our services.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How We Collect Information</h2>
          <p>We use different methods to collect data from and about you including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Direct interactions:</strong> You may give us your Identity, Contact, and Organization Data by filling in forms or by corresponding with us by post, phone, email, or otherwise.</li>
            <li><strong>Automated technologies or interactions:</strong> As you interact with our website, we may automatically collect Technical Data about your equipment, browsing actions, and patterns.</li>
            <li><strong>Third parties:</strong> We may receive personal data about you from various third parties, such as analytics providers, authentication providers (like Google), and other technical service providers.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <p className="mt-4">We use your data for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>To register you as a new customer and provide our services</li>
            <li>To manage our relationship with you</li>
            <li>To administer and protect our business and this website</li>
            <li>To deliver relevant website content and advertisements to you</li>
            <li>To use data analytics to improve our website, products/services, marketing, customer relationships, and experiences</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Sharing Your Information</h2>
          <p>We may share your personal data with the following parties:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Service providers:</strong> who provide IT and system administration services.</li>
            <li><strong>Professional advisers:</strong> including lawyers, bankers, auditors, and insurers who provide consultancy, banking, legal, insurance, and accounting services.</li>
            <li><strong>Authorities:</strong> such as regulators and other authorities who require reporting of processing activities in certain circumstances.</li>
            <li><strong>Third parties:</strong> to whom we may choose to sell, transfer, or merge parts of our business or our assets. Alternatively, we may seek to acquire other businesses or merge with them.</li>
          </ul>
          <p className="mt-4">
            We require all third parties to respect the security of your personal data and to treat it in accordance with the law. We do not allow our third-party service providers to use your personal data for their own purposes and only permit them to process your personal data for specified purposes and in accordance with our instructions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know. They will only process your personal data on our instructions, and they are subject to a duty of confidentiality.
          </p>
          <p className="mt-4">
            We have put in place procedures to deal with any suspected personal data breach and will notify you and any applicable regulator of a breach where we are legally required to do so.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Retention</h2>
          <p>
            We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
          </p>
          <p className="mt-4">
            To determine the appropriate retention period for personal data, we consider the amount, nature, and sensitivity of the personal data, the potential risk of harm from unauthorized use or disclosure of your personal data, the purposes for which we process your personal data and whether we can achieve those purposes through other means, and the applicable legal requirements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Legal Rights</h2>
          <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Request access</strong> to your personal data.</li>
            <li><strong>Request correction</strong> of your personal data.</li>
            <li><strong>Request erasure</strong> of your personal data.</li>
            <li><strong>Object to processing</strong> of your personal data.</li>
            <li><strong>Request restriction of processing</strong> your personal data.</li>
            <li><strong>Request transfer</strong> of your personal data.</li>
            <li><strong>Right to withdraw consent</strong> where we are relying on consent to process your personal data.</li>
          </ul>
          <p className="mt-4">
            You will not have to pay a fee to access your personal data (or to exercise any of the other rights). However, we may charge a reasonable fee if your request is clearly unfounded, repetitive, or excessive. Alternatively, we could refuse to comply with your request in these circumstances.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Changes to This Privacy Policy</h2>
          <p>
            We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date at the top of this privacy policy.
          </p>
          <p className="mt-4">
            You are advised to review this privacy policy periodically for any changes. Changes to this privacy policy are effective when they are posted on this page.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us at:
          </p>
          <p className="font-medium">Email: pawnmedia.ph@gmail.com</p>
        </section>
      </div>
    </div>
  );
}