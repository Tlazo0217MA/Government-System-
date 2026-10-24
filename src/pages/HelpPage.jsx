import { Breadcrumbs } from '../components/Navigation.jsx';

const FAQ = [
  ['How do I apply for a service?', 'Open Services, choose a service and follow the steps. Your identity details are filled in for you.'],
  ['How do I track an application?', 'Open My Applications and select View. The progress list shows each step.'],
  ['How do I upload a document?', 'Choose a PDF, JPG or PNG up to 5 MB. You can remove and replace it before you submit.'],
  ['What do the statuses mean?', 'Submitted: received. Under Review: an officer is checking. Requires Additional Information: you must respond. Approved or Rejected: a decision was made. Completed: finished.'],
  ['How do I correct my details?', 'Open My Profile and choose Request a correction. Home Affairs will review it.'],
  ['What accessibility help is there?', 'Home Affairs records your needs when you register, and this site adjusts itself. You can also change the language, use the Text size button, and use the Voice button.'],
];

export default function HelpPage() {
  return (
    <>
      <Breadcrumbs items={[['Help']]} />
      <h1>Help</h1>
      {FAQ.map(([question, answer]) => (
        <details key={question} className="card">
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </>
  );
}
