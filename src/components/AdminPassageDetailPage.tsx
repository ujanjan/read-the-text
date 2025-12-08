import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const AdminPassageDetailPage: React.FC = () => {
    const { passageId } = useParams<{ passageId: string }>();

    return (
        <div className="admin-page">
            <div className="admin-container">
                <div className="flex justify-between items-center mb-6">
                    <h1>Passage Detail: {passageId}</h1>
                    <Link to="/admin" className="back-link">
                        ← Back to Admin
                    </Link>
                </div>

                <div className="placeholder-content">
                    <p>Passage detail page for <strong>{passageId}</strong></p>
                    <p className="text-gray-500">Additional analytics and details will be added here.</p>
                </div>
            </div>
        </div>
    );
};
