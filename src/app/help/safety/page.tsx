import ResourceList from "@/components/privacy/ResourceList";

export default function SafetyCenter() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">You're not alone.</h1>
      <p>Sparq is here to help you two connect. If things feel heavy, here are options you control:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Talk to someone you trust</li>
        <li>Take a break and return when ready</li>
        <li>Use the resources below</li>
      </ul>
      <section>
        <h2 className="text-xl font-semibold mt-6">Support resources</h2>
        <ResourceList />
      </section>
    </main>
  );
}
