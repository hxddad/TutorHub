// // import { useEffect, useState } from "react";

// // export default function StudyPlanForm({ studentId, onSaved }: any) {
// //   const [courses, setCourses] = useState<any[]>([]);
// //   const [tasks, setTasks] = useState([{ title: "", courseId: "", dueDate: "" }]);

// //   useEffect(() => {
// //     fetch("/api/courses/mine") // load student/tutor courses
// //       .then((res) => res.json())
// //       .then((data) => setCourses(data));
// //   }, []);

// //   const handleTaskChange = (index: number, field: string, value: string) => {
// //     const newTasks = [...tasks];
// //     newTasks[index][field] = value;
// //     setTasks(newTasks);
// //   };

// //   const addTask = () => setTasks([...tasks, { title: "", courseId: "", dueDate: "" }]);

// //   const savePlan = async () => {
// //     await fetch("/api/study-plans", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ studentId, tasks }),
// //     });
// //     if (onSaved) onSaved();
// //   };

// //   return (
// //     <div>
// //       {tasks.map((t, i) => (
// //         <div key={i} className="mb-4 border p-2 rounded">
// //           <input
// //             placeholder="Task title"
// //             value={t.title}
// //             onChange={(e) => handleTaskChange(i, "title", e.target.value)}
// //             className="border rounded px-2 py-1 mr-2"
// //           />
// //           <select
// //             value={t.courseId}
// //             onChange={(e) => handleTaskChange(i, "courseId", e.target.value)}
// //             className="border rounded px-2 py-1 mr-2"
// //           >
// //             <option value="">Select course</option>
// //             {courses.map((c) => (
// //               <option key={c.id} value={c.id}>
// //                 {c.title}
// //               </option>
// //             ))}
// //           </select>
// //           <input
// //             type="date"
// //             value={t.dueDate}
// //             onChange={(e) => handleTaskChange(i, "dueDate", e.target.value)}
// //             className="border rounded px-2 py-1"
// //           />
// //         </div>
// //       ))}
// //       <button onClick={addTask} className="bg-blue-600 text-white px-3 py-1 rounded mr-2">
// //         + Add Task
// //       </button>
// //       <button onClick={savePlan} className="bg-green-600 text-white px-3 py-1 rounded">
// //         Save Plan
// //       </button>
// //     </div>
// //   );
// // }

// "use client";

// import { useEffect, useState } from "react";


// type Task = {
//   title: string;
//   courseId: string;
//   dueDate: string;
// };

// type Course = {
//   id: string;
//   title: string;
// };

// type StudyPlanFormProps = {
//   studentId: string;
//   onSaved?: () => void;
// };

// export default function StudyPlanForm({ studentId, onSaved }: StudyPlanFormProps) {
//   const [courses, setCourses] = useState<Course[]>([]);
//   const [tasks, setTasks] = useState<Task[]>([
//     { title: "", courseId: "", dueDate: "" },
//   ]);

//   // Load courses
//   // useEffect(() => {
//   //   async function loadCourses() {
//   //     try {
//   //       const res = await fetch("/api/courses/mine");
//   //       const data = await res.json();
//   //       if (Array.isArray(data)) {
//   //         setCourses(data);
//   //       } else {
//   //         setCourses([]);
//   //       }
//   //     } catch (err) {
//   //       console.error("Failed to load courses:", err);
//   //       setCourses([]);
//   //     }
//   //   }

//   //   loadCourses();
//   // }, []);


//   useEffect(() => {
//   async function loadCourses() {
//     try {
//       const res = await fetch(`/api/courses/enrolled?studentId=${studentId}`);
//       const data = await res.json();
//       if (Array.isArray(data)) setCourses(data);
//       else setCourses([]);
//     } catch (err) {
//       console.error("Failed to load enrolled courses:", err);
//       setCourses([]);
//     }
//   }

//   loadCourses();
// }, [studentId]);


//   // const handleTaskChange = (index: number, field: keyof Task, value: string) => {
//   //   const updated = [...tasks];
//   //   updated[index][field] = value;
//   //   setTasks(updated);
//   // };

//   const handleTaskChange = (index: number, field: keyof Task, value: string) => {
//   const updated = [...tasks];
//   updated[index] = { ...updated[index], [field]: value }; // better typing
//   setTasks(updated);
// };
//   const addTask = () => {
//     setTasks([...tasks, { title: "", courseId: "", dueDate: "" }]);
//   };

//   // const savePlan = async () => {

//   //   // Basic validation
//   //   for (const t of tasks) {
//   //     if (!t.title || !t.courseId || !t.dueDate) {
//   //       alert("Please fill all fields for each task");
//   //       return;
//   //     }
//   //   }
//   //   try {
//   //     const res = await fetch("/api/study-plans", {
//   //       method: "POST",
//   //       headers: { "Content-Type": "application/json" },
//   //       body: JSON.stringify({ studentId, tasks }),
//   //     });
//   //     if (!res.ok) throw new Error("Failed to save study plan");
//   //     if (onSaved) onSaved();
//   //   } catch (err) {
//   //     console.error(err);
//   //     alert("Error saving study plan");
//   //   }
//   // };


//   const savePlan = async () => {
//   for (const t of tasks) {
//     if (!t.title || !t.courseId || !t.dueDate) {
//       alert("Please fill all fields for each task");
//       return;
//     }
//   }

//   try {
//     const res = await fetch("/api/study-plans", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         studentId,
//         tasks: tasks.map((t) => ({
//           title: t.title,
//           courseId: t.courseId, // include courseId
//           dueDate: t.dueDate,
//         })),
//       }),
//     });
//     if (!res.ok) throw new Error("Failed to save study plan");
//     if (onSaved) onSaved();
//   } catch (err) {
//     console.error(err);
//     alert("Error saving study plan");
//   }
// };

//   return (
//     <div>
//       {tasks.map((t, i) => (
//         <div key={i} className="mb-4 border p-2 rounded flex gap-2 items-center">
//           <input
//             placeholder="Task title"
//             value={t.title}
//             onChange={(e) => handleTaskChange(i, "title", e.target.value)}
//             className="border rounded px-2 py-1 flex-1"
//           />

//           <select
//             value={t.courseId}
//             onChange={(e) => handleTaskChange(i, "courseId", e.target.value)}
//             className="border rounded px-2 py-1 flex-1"
//           >
//             <option value="">Select course</option>
//             {courses.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {c.title}
//               </option>
//             ))}
//           </select>

//           <input
//             type="date"
//             value={t.dueDate}
//             onChange={(e) => handleTaskChange(i, "dueDate", e.target.value)}
//             className="border rounded px-2 py-1 flex-1"
//           />
//         </div>
//       ))}

//       <div className="flex gap-2">
//         <button onClick={addTask} className="bg-blue-600 text-white px-3 py-1 rounded">
//           + Add Task
//         </button>
//         <button onClick={savePlan} className="bg-green-600 text-white px-3 py-1 rounded">
//           Save Plan
//         </button>
//       </div>
//     </div>
//   );
// }


// import StudyPlanForm from "@/components/StudyPlanForm";
// import { verifyToken } from "@/lib/jwt";
// import { cookies } from "next/headers"; // server-side cookies helper

// export default async function CreateStudyPlanPage() {
//   try {
//     // Get the token from cookies
//     const token = cookies().get("authToken")?.value;

//     if (!token) {
//       console.log("No token found in cookies");
//       return <p>Please log in</p>;
//     }

//     const payload = verifyToken(token);

//     if (!payload || payload.role !== "STUDENT") {
//       console.log("Forbidden access or wrong role");
//       return <p>Forbidden</p>;
//     }

//     const studentId = payload.sub;

//     return (
//       <main className="p-8">
//         <h1 className="text-2xl font-semibold mb-4">Create Study Plan</h1>
//         <StudyPlanForm
//           studentId={studentId}
//           onSaved={() => alert("Study Plan Saved!")}
//         />
//       </main>
//     );
//   } catch (err) {
//     console.error("Error verifying token:", err);
//     return <p>Error verifying user</p>;
//   }
// }


"use client";

import { useEffect, useState } from "react";

type Task = { title: string; courseId: string; dueDate: string; };
type Course = { id: string; title: string; };

type StudyPlanFormProps = { studentId: string };

export default function StudyPlanForm({ studentId }: StudyPlanFormProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([{ title: "", courseId: "", dueDate: "" }]);

  useEffect(() => {


    async function loadCourses() {
      try {
        const res = await fetch(`/api/courses/enrolled?studentId=${studentId}`);
        const data = await res.json();
        if (Array.isArray(data)) setCourses(data);
        else setCourses([]);
      } catch (err) {
        console.error("Failed to load enrolled courses:", err);
        setCourses([]);
      }
    }

    loadCourses();
  }, [studentId]);


  const handleTaskChange = (index: number, field: keyof Task, value: string) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const addTask = () => setTasks([...tasks, { title: "", courseId: "", dueDate: "" }]);

  const savePlan = async () => {
    for (const t of tasks) {
      if (!t.title || !t.courseId || !t.dueDate) {
        alert("Please fill all fields for each task");
        return;
      }
    }

    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, tasks }),
      });
      if (!res.ok) throw new Error("Failed to save study plan");

      // Handle success inside client component
      alert("Study Plan Saved!");
      setTasks([{ title: "", courseId: "", dueDate: "" }]); // optionally reset form
    } catch (err) {
      console.error(err);
      alert("Error saving study plan");
    }
  };

  return (
    <div>
      {tasks.map((t, i) => (
        <div key={i} className="mb-4 border p-2 rounded flex gap-2 items-center">
          <input
            placeholder="Task title"
            value={t.title}
            onChange={(e) => handleTaskChange(i, "title", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <select
            value={t.courseId}
            onChange={(e) => handleTaskChange(i, "courseId", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <input
            type="date"
            value={t.dueDate}
            onChange={(e) => handleTaskChange(i, "dueDate", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={addTask} className="bg-blue-600 text-white px-3 py-1 rounded">+ Add Task</button>
        <button onClick={savePlan} className="bg-green-600 text-white px-3 py-1 rounded">Save Plan</button>
      </div>
    </div>
  );
}