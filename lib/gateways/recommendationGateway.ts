// lib/gateways/recommendationGateway.ts
// External service integration for the Python recommendation service
// Isolates all fetch logic, URL construction, and downstream failure handling
// FR15 (recommendations), NFR7 (interoperability), NFR8 (graceful failure), NFR15 (SRP)

const BASE_URL = process.env.RECOMMENDATION_SERVICE_URL ?? "http://localhost:8000";

// FR15 - fetch tutor recommendations for a given student from the Python service
// throws { status, message } on failure so the route can handle it uniformly
export async function getRecommendationsForStudent(studentId: string) {
  const res = await fetch(`${BASE_URL}/recommendations/${studentId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    // NFR8 - surface the downstream HTTP status so the route can relay it faithfully
    throw { status: res.status, message: "Failed to fetch recommendations" };
  }

  return res.json();
}
