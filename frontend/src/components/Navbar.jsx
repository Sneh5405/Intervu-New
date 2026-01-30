import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from './ui/Button';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const isAuthPage = ['/login', '/signup'].includes(location.pathname);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white">
                            I
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            InterVue
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <>
                                <Link to="/interviews">
                                    <Button variant="ghost" className="text-slate-300">Interviews</Button>
                                </Link>
                                {(user.role === 'HR' || user.role === 'INTERVIEWER') && (
                                    <Link to="/questions">
                                        <Button variant="ghost" className="text-slate-300">Question Bank</Button>
                                    </Link>
                                )}
                                <span className="text-slate-300 text-sm mr-2">Hello, {user.name}</span>
                                {user.role === 'HR' && (
                                    <Link to="/admin">
                                        <Button variant="ghost">Admin Dashboard</Button>
                                    </Link>
                                )}
                                <Button variant="secondary" onClick={logout}>Log out</Button>
                            </>
                        ) : (
                            !isAuthPage && (
                                <>
                                    <Link to="/login">
                                        <Button variant="ghost">Log in</Button>
                                    </Link>
                                    <Link to="/signup">
                                        <Button variant="primary">Sign up</Button>
                                    </Link>
                                </>
                            )
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
