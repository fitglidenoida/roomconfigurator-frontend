'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectDataPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the summary page where the actual project data functionality is implemented
    router.replace('/summary');
  }, [router]);

  return (
    <div className="container mx-auto p-6">
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-lg">Redirecting to Project Data...</p>
      </div>
    </div>
  );
} 