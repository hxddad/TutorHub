"use client";

import { useEffect, useState } from "react";

interface Recommendation {
  tutorId: string;
  tutorName: string;
  courseId: number;
  courseTitle: string;
  courseSubject: string;
  courseLevel: string;
  coursePrice: number;
  averageRating: number;
  totalStudents: number;
}

interface Props {
  studentId: string;
}

export default function RecommendedTutors({ studentId }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/recommendations?studentId=${studentId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load recommendations");
          return;
        }

        setRecommendations(data.recommendations);
      } catch (err) {
        setError("Could not connect to recommendation service");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [studentId]);

  if (loading) return <p className="text-gray-500">Loading recommendations...</p>;

  if (error) return (
    <div className="rounded-xl border p-6 bg-gray-50">
      <h2 className="text-xl font-bold mb-2">Recommended Tutors</h2>
      <p className="text-gray-400 text-sm">{error}</p>
    </div>
  );

  if (recommendations.length === 0) return (
    <div className="rounded-xl border p-6 bg-gray-50">
      <h2 className="text-xl font-bold mb-2">Recommended Tutors</h2>
      <p className="text-gray-400 text-sm">No recommendations yet. Enroll in a course to get started.</p>
    </div>
  );

  return (
    <div className="rounded-xl border p-6">
      <h2 className="text-xl font-bold mb-4">Recommended Tutors</h2>
      <div className="grid grid-cols-1 gap-4">
        {recommendations.map((rec) => (
          <div key={rec.courseId} className="border rounded-lg p-4 hover:shadow-md transition">
            <h3 className="font-semibold text-lg">{rec.tutorName}</h3>
            <p className="text-sm text-gray-600">{rec.courseTitle} · {rec.courseSubject}</p>
            <p className="text-sm text-gray-500">Level: {rec.courseLevel ?? "N/A"}</p>
            <p className="text-sm text-gray-500">
              ⭐ {rec.averageRating ?? "No rating"} · {rec.totalStudents} students
            </p>
            {rec.coursePrice != null && (
              <p className="text-sm font-medium text-green-700 mt-1">${rec.coursePrice}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}