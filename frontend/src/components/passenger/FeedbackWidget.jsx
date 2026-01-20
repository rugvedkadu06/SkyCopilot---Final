
import React, { useState } from 'react';
import axios from 'axios';

const FeedbackWidget = ({ flightId }) => {
    const [rating, setRating] = useState(0);
    const [emoji, setEmoji] = useState(null);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const EMOJIS = [
        { label: 'Angry', icon: '😡', val: 1 },
        { label: 'Frustrated', icon: '😣', val: 2 },
        { label: 'Neutral', icon: '😐', val: 3 },
        { label: 'Okay', icon: '🙂', val: 4 },
        { label: 'Happy', icon: '😊', val: 5 },
    ];

    const handleSubmit = async () => {
        if (!rating && !emoji) return;
        try {
            await axios.post('http://localhost:8000/passenger/feedback', {
                flight_id: flightId,
                rating: rating || (emoji ? emoji.val : 3),
                comment: comment
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
        }
    };

    if (submitted) {
        return (
            <div className="bg-surface border border-surface-border rounded-xl p-6 text-center animate-fadeIn">
                <div className="text-4xl mb-2">🙏</div>
                <h3 className="text-white font-bold">Thank You</h3>
                <p className="text-xs text-gray-500">Your feedback helps us improve.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface border border-surface-border rounded-xl p-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider text-center">How are we doing?</h3>

            <div className="flex justify-between mb-6 px-2">
                {EMOJIS.map((e) => (
                    <button
                        key={e.label}
                        onClick={() => { setEmoji(e); setRating(e.val); }}
                        className={`text-2xl transition-all hover:scale-125 p-2 rounded-full ${emoji?.label === e.label ? 'bg-accent/20 scale-125 shadow-lg ring-2 ring-accent' : 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                        title={e.label}
                    >
                        {e.icon}
                    </button>
                ))}
            </div>

            <textarea
                className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-xs text-white focus:border-accent outline-none mb-4 resize-none h-20"
                placeholder="Any suggestions? (Optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />

            <button
                onClick={handleSubmit}
                disabled={!rating}
                className="w-full bg-white text-black font-bold py-2 rounded-lg text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                SUBMIT FEEDBACK
            </button>
        </div>
    );
};

export default FeedbackWidget;
