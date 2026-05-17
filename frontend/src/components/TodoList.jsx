export default function TodoList({ todos }) {
  return (
    <div className="card">
      <h2>TODOs</h2>

      {todos.map((todo) => (
        <div
          key={todo.id}
          style={{
            borderBottom: "1px solid #333",
            paddingBottom: "10px",
            marginBottom: "10px",
          }}
        >
          <strong>{todo.title}</strong>

          <p>{todo.description}</p>

          <p>
            [{todo.todo_type}]
            {" "}
            Priority:
            {" "}
            {todo.priority}
          </p>

          <p>Status: {todo.status}</p>
        </div>
      ))}
    </div>
  );
}