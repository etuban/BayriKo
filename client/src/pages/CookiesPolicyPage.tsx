import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CookiesPolicyPage() {
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
          <h1 className="text-3xl font-bold">Cookies Policy</h1>
          <p className="text-gray-500 mt-2">Last updated: April 27, 2025</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Introduction</h2>
          <p>
            This Cookies Policy explains how BayriKo ("we", "us", or "our") uses cookies and similar technologies to recognize you when you visit our website and application. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">What Are Cookies?</h2>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
          <p className="mt-4">
            Cookies set by the website owner (in this case, BayriKo) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Why Do We Use Cookies?</h2>
          <p>We use first-party and third-party cookies for several reasons:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Essential cookies:</strong> Necessary for the operation of our website and application. They include, for example, cookies that enable you to log into secure areas.</li>
            <li><strong>Functionality cookies:</strong> Allow us to remember choices you have made and provide enhanced, personalized features.</li>
            <li><strong>Performance/Analytics cookies:</strong> Collect information about how visitors use our website, which pages they visit, and if they experience any errors. These cookies do not collect information that identifies a visitor.</li>
            <li><strong>Targeting cookies:</strong> Record your visit to our website, the pages you have visited, and the links you have followed to make our website more relevant to your interests.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cookies We Use</h2>
          <p>The specific cookies we use include:</p>
          
          <h3 className="text-xl font-medium mt-6">Essential Cookies</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Session cookies:</strong> Used to maintain your session and authentication state while using our application.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-6">Functionality Cookies</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Preference cookies:</strong> Store your preferences, such as language and display settings.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-6">Performance/Analytics Cookies</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Google Analytics:</strong> Collects anonymous information about how you use our site to help us improve its functionality and user experience.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How to Control Cookies</h2>
          <p>
            You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, but your access to some functionality and areas may be restricted.
          </p>
          <p className="mt-4">
            The specific way to refuse cookies through your web browser controls varies from browser to browser. You should visit your browser's help menu for more information.
          </p>
          <p className="mt-4">
            Here are links to instructions for managing cookies in some popular browsers:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Third-Party Cookies</h2>
          <p>
            In addition to our own cookies, we may also use various third-party cookies to report usage statistics, deliver advertisements, and so on. These cookies may be placed when you interact with services we use, such as social media sites, analytics services, and advertising networks.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Do Not Track</h2>
          <p>
            Some browsers have a "Do Not Track" feature that signals to websites that you visit that you do not want to have your online activity tracked. Our website does not currently respond to "Do Not Track" signals.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Changes to This Cookie Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will become effective when we post the revised policy, and your continued use of our services following these changes means that you accept the revised Cookie Policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
          </p>
          <p className="font-medium">Email: pawnmedia.ph@gmail.com</p>
        </section>
      </div>
    </div>
  );
}