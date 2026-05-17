export default function TechStackCard({ techStack }) {
  if (!techStack) {
    return <div className="card">Loading Tech Stack...</div>;
  }

  return (
    <div className="card">
      <h2>Tech Stack</h2>

      {techStack.items?.map((item) => (
        <div
          key={item.language}
          style={{
            marginBottom: "12px",
          }}
        >
          <strong>{item.language}</strong>

          <p>
            {item.percentage}%
            {" "}
            ({item.lines_count} lines)
          </p>
        </div>
      ))}
    </div>
  );
}