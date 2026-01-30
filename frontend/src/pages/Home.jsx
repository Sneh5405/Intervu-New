import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const Home = () => {
    return (
        <div className="min-h-screen bg-slate-900 pt-16">
            <div className="relative overflow-hidden">
                {/* Background blobls */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-10 animate-blob animation-delay-2000"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Master Your Next
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                            Technical Interview
                        </span>
                    </h1>

                    <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 mb-12">
                        InterVue connects you with industry experts for mock interviews, providing real-time feedback and collaborative coding environments.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/signup">
                            <Button className="text-lg px-8 py-4">
                                Get Started
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="outline" className="text-lg px-8 py-4">
                                Sign In
                            </Button>
                        </Link>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-3 gap-8 mt-24">
                        {[
                            {
                                title: "Real-time Collaboration",
                                desc: "Code together in real-time with our advanced collaborative editor."
                            },
                            {
                                title: "Expert Feedback",
                                desc: "Get detailed, actionable feedback from experienced interviewers."
                            },
                            {
                                title: "Mock Interviews",
                                desc: "Practice with realistic scenarios tailored to your target role."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-slate-800/50 backdrop-blur-lg border border-slate-700/50">
                                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
