export default function ReadmeDashboardCard({ data }) {
  if (!data) {
    return <div className="card">Loading README...</div>;
  }

  return (
    <div className="card">
      <h2>README Dashboard</h2>

      <p>Status: {data.status}</p>

      <p>Priority: {data.priority}</p>

      <p>Next Action: {data.next_action}</p>

      <p>Problem: {data.problem}</p>

      <p>
        Tags:
        {" "}
        {data.tags?.join(", ")}
      </p>
    </div>
  );
}