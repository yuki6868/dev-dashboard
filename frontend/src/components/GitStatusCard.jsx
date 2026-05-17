export default function GitStatusCard({ gitStatus }) {
  if (!gitStatus) {
    return <div className="card">Loading Git Status...</div>;
  }

  return (
    <div className="card">
      <h2>Git Status</h2>

      <p>Branch: {gitStatus.branch}</p>

      <p>
        Latest Commit:
        {" "}
        {gitStatus.latest_commit_message}
      </p>

      <p>
        Changed Files:
        {" "}
        {gitStatus.changed_files_count}
      </p>

      <p>
        Uncommitted Changes:
        {" "}
        {gitStatus.has_uncommitted_changes ? "Yes" : "No"}
      </p>

      <p>
        Ahead:
        {" "}
        {gitStatus.ahead}
        {" "}
        / Behind:
        {" "}
        {gitStatus.behind}
      </p>
    </div>
  );
}