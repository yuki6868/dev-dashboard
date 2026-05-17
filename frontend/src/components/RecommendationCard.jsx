export default function RecommendationCard({ data }) {
  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="card recommendation-card">
      <h2>今日やること</h2>

      <p>
        <strong>{data.project_name}</strong>
      </p>

      {data.recommended_todo && (
        <>
          <p>{data.recommended_todo.title}</p>

          <p>
            [{data.recommended_todo.todo_type}] Priority:
            {" "}
            {data.recommended_todo.priority}
          </p>
        </>
      )}

      <p>Score: {data.score}</p>
    </div>
  );
}