export default function InactivityCard({ items }) {
  return (
    <div className="card">
      <h2>放置アラート</h2>

      {items.map((item) => (
        <div
          key={item.project_id}
          style={{
            borderBottom: "1px solid #ccc",
            marginBottom: "10px",
            paddingBottom: "10px",
          }}
        >
          <strong>{item.project_name}</strong>

          <p>Status: {item.status}</p>

          <ul>
            {item.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}