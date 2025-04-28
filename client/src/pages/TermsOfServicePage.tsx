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
            Welcome to BayriKo. These Terms of Service ("Terms") govern your use
            of our website and services. Please read these Terms carefully
            before using our services.
          </p>
          <p className="mt-4">
            By accessing or using our services, you agree to be bound by these
            Terms. If you disagree with any part of the Terms, you may not
            access our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Definitions</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>"BayriKo"</strong> refers to our company, our website, and
              our task management platform.
            </li>
            <li>
              <strong>"Services"</strong> refers to the task management platform
              and related services provided by BayriKo.
            </li>
            <li>
              <strong>"User"</strong> refers to any individual or entity that
              accesses or uses our Services.
            </li>
            <li>
              <strong>"Content"</strong> refers to any information, data, text,
              software, graphics, messages, or other materials that are
              uploaded, posted, or otherwise transmitted through our Services.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Use of Services</h2>
          <p>
            Our Services are designed to help organizations manage tasks,
            projects, and team collaboration. You may use our Services only as
            permitted by these Terms and any applicable laws and regulations.
          </p>
          <p className="mt-4">
            To access certain features of our Services, you may be required to
            register for an account. When you register, you agree to provide
            accurate, current, and complete information about yourself and your
            organization.
          </p>
          <p className="mt-4">
            You are responsible for safeguarding your account credentials and
            for any activities or actions under your account. We encourage you
            to use strong passwords and to keep your account information secure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">User Content</h2>
          <p>
            Our Services allow you to upload, store, and share Content. You
            retain ownership of any intellectual property rights that you hold
            in that Content. By uploading Content, you grant BayriKo a
            worldwide, royalty-free license to use, reproduce, modify, adapt,
            publish, translate, and distribute it in any existing or future
            media.
          </p>
          <p className="mt-4">You represent and warrant that:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              You own the Content or have the right to use it and grant us the
              rights and license as provided in these Terms.
            </li>
            <li>
              The Content does not violate the privacy rights, publicity rights,
              copyrights, contract rights, or any other rights of any person or
              entity.
            </li>
            <li>
              The Content does not contain any material that is defamatory,
              obscene, indecent, abusive, offensive, harassing, violent,
              hateful, inflammatory, or otherwise objectionable.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Intellectual Property</h2>
          <p>
            The Service and its original content (excluding Content provided by
            users), features, and functionality are and will remain the
            exclusive property of BayriKo and its licensors. The Service is
            protected by copyright, trademark, and other laws of both the
            Philippines and foreign countries. Our trademarks and trade dress
            may not be used in connection with any product or service without
            the prior written consent of BayriKo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the
            Service immediately, without prior notice or liability, under our
            sole discretion, for any reason whatsoever and without limitation,
            including but not limited to a breach of the Terms.
          </p>
          <p className="mt-4">
            If you wish to terminate your account, you may simply discontinue
            using the Service or contact us to request account deletion.
          </p>
          <p className="mt-4">
            All provisions of the Terms which by their nature should survive
            termination shall survive termination, including, without
            limitation, ownership provisions, warranty disclaimers, indemnity,
            and limitations of liability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
          <p>
            In no event shall BayriKo, nor its directors, employees, partners,
            agents, suppliers, or affiliates, be liable for any indirect,
            incidental, special, consequential, or punitive damages, including
            without limitation, loss of profits, data, use, goodwill, or other
            intangible losses, resulting from:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Your access to or use of or inability to access or use the
              Service;
            </li>
            <li>Any conduct or content of any third party on the Service;</li>
            <li>Any content obtained from the Service; and</li>
            <li>
              Unauthorized access, use, or alteration of your transmissions or
              content,
            </li>
          </ul>
          <p className="mt-4">
            whether based on warranty, contract, tort (including negligence), or
            any other legal theory, whether or not we have been informed of the
            possibility of such damage, and even if a remedy set forth herein is
            found to have failed of its essential purpose.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Disclaimer</h2>
          <p>
            Your use of the Service is at your sole risk. The Service is
            provided on an "AS IS" and "AS AVAILABLE" basis. The Service is
            provided without warranties of any kind, whether express or implied,
            including, but not limited to, implied warranties of
            merchantability, fitness for a particular purpose, non-infringement,
            or course of performance.
          </p>
          <p className="mt-4">
            BayriKo does not warrant that: (a) the Service will function
            uninterrupted, secure, or available at any particular time or
            location; (b) any errors or defects will be corrected; (c) the
            Service is free of viruses or other harmful components; or (d) the
            results of using the Service will meet your requirements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the
            laws of the Philippines, without regard to its conflict of law
            provisions.
          </p>
          <p className="mt-4">
            Our failure to enforce any right or provision of these Terms will
            not be considered a waiver of those rights. If any provision of
            these Terms is held to be invalid or unenforceable by a court, the
            remaining provisions of these Terms will remain in effect.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace
            these Terms at any time. If a revision is material, we will provide
            at least 30 days' notice prior to any new terms taking effect. What
            constitutes a material change will be determined at our sole
            discretion.
          </p>
          <p className="mt-4">
            By continuing to access or use our Service after any revisions
            become effective, you agree to be bound by the revised terms. If you
            do not agree to the new terms, you are no longer authorized to use
            the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="font-medium">
            Email:{" "}
            <a href="mailto:pawnmedia.ph@gmail.com">pawnmedia.ph@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
