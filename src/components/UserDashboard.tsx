// src/components/UserDashboard.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { dashboardAPI, voteAPI, announcementsAPI, adminAPI } from '@/services/api';
import { CharacterEquipment } from '@/types/api';
import CharacterRenderer from './CharacterRenderer';
import { 
  Home, Users, Trophy, LogOut, Bell, ChevronRight, Calendar, 
  AlertCircle, Zap, Star, Sword, Shield, Crown, User, Download,
  TrendingUp, Clock, MessageCircle, Settings, Sparkles, Heart,
  CheckCircle, ArrowRight, ExternalLink, Gamepad2, X
} from 'lucide-react';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hoveredPlayer, setHoveredPlayer] = useState<any>(null);
  
  // Updated vote state structure
  const [voteData, setVoteData] = useState<{
    sites: any[];
    voteStatus: any;
    todayRewards: number;
    username: string;
    currentNX: number;
    totalVotes: number;
  }>({
    sites: [],
    voteStatus: {},
    todayRewards: 0,
    username: '',
    currentNX: 0,
    totalVotes: 0
  });

  const [userData, setUserData] = useState({
    username: "Loading...",
    level: 0,
    job: "Loading...",
    guild: "Legends",
    nx: 0,
    votePoints: 0
  });
  const [onlineCount, setOnlineCount] = useState(0);
  const [characters, setCharacters] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [userRanking, setUserRanking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats (user info + online count)
      const statsResponse = await dashboardAPI.getStats();
      if (statsResponse.ok) {
        const statsData = statsResponse.data;
        setUserData({
          username: statsData.user.username,
          level: statsData.mainCharacter?.level || 1,
          job: statsData.mainCharacter?.job || "Beginner",
          guild: "Legends",
          nx: (statsData.user.nx || 0),
          votePoints: statsData.user.votePoints || 0
        });
        setOnlineCount(statsData.onlineCount);
      }

      // Check if user is admin
      const adminResponse = await adminAPI.checkAccess();
      if (adminResponse.ok) {
        setIsAdmin(adminResponse.data.isAdmin);
      }

      // Fetch characters
      const charactersResponse = await dashboardAPI.getCharacters();
      if (charactersResponse.ok) {
        setCharacters(charactersResponse.data.characters || []);
      }

      // Fetch rankings
      const rankingsResponse = await dashboardAPI.getRankings();
      if (rankingsResponse.ok) {
        setRankings(rankingsResponse.data.rankings || []);
        setUserRanking(rankingsResponse.data.userRanking);
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vote status
  const fetchVoteStatus = async () => {
    try {
      const response = await voteAPI.getStatus();
      if (response.ok) {
        setVoteData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch vote status:', error);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getAll();
      if (response.ok) {
        setAnnouncements(response.data.announcements || []);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  // Manual refresh function
  const refreshData = () => {
    fetchDashboardData();
    fetchVoteStatus();
    fetchAnnouncements();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltipRef.current && hoveredPlayer) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Default position (right of cursor)
      let left = e.clientX + 15;
      let top = e.clientY - tooltipRect.height / 2;
      
      // Check right edge
      if (left + tooltipRect.width > viewportWidth - 10) {
        // Position to the left of cursor instead
        left = e.clientX - tooltipRect.width - 15;
      }
      
      // Check bottom edge
      if (top + tooltipRect.height > viewportHeight - 10) {
        // Adjust to stay within viewport
        top = viewportHeight - tooltipRect.height - 10;
      }
      
      // Check top edge
      if (top < 10) {
        top = 10;
      }
      
      // Check left edge (in case repositioning pushed it off left side)
      if (left < 10) {
        left = 10;
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  };

  const handleMouseEnter = (player: any) => {
    setHoveredPlayer(player);
    if (tooltipRef.current) {
      // Small delay to ensure tooltip content is rendered before showing
      setTimeout(() => {
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '1';
        }
      }, 10);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPlayer(null);
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = '0';
    }
  };

  // Check if user can vote for a specific site
  const canVote = (siteName: string) => {
    const siteKey = siteName.toLowerCase().replace(/\s+/g, '');
    const status = voteData.voteStatus[siteKey];
    if (!status) return true;
    
    if (status.canVoteAt) {
      return Date.now() >= status.canVoteAt;
    }
    
    return !status.voted;
  };

  // Get remaining cooldown time for a site
  const getRemainingCooldown = (siteName: string) => {
    const siteKey = siteName.toLowerCase().replace(/\s+/g, '');
    const status = voteData.voteStatus[siteKey];
    if (!status || !status.canVoteAt) return 0;
    
    return Math.max(0, status.canVoteAt - Date.now());
  };

  // Handle vote click - opens site with proper pingUsername format
  const handleVote = async (site: any) => {
    const siteKey = site.name.toLowerCase().replace(/\s+/g, '');
    
    if (!canVote(site.name)) return;

    // Set pending status
    setVoteData(prev => ({
      ...prev,
      voteStatus: {
        ...prev.voteStatus,
        [siteKey]: { ...prev.voteStatus[siteKey], pending: true }
      }
    }));

    // Construct vote URL with pingUsername for Gtop100
    let voteUrl = site.url;
    if (site.name === 'Gtop100') {
      // For Gtop100, append the username to the pingUsername parameter
      voteUrl = `${site.url}${voteData.username}`;
    } else {
      // For other sites, use the old format
      voteUrl = `${site.url}?username=${voteData.username}&ref=dashboard`;
    }
    
    // Open vote site in new tab
    const voteWindow = window.open(voteUrl, '_blank');
    
    // Optional: Check if vote window is closed (user completed vote)
    const checkClosed = setInterval(() => {
      if (voteWindow?.closed) {
        clearInterval(checkClosed);
        // Refresh vote status after user closes vote window
        setTimeout(() => {
          fetchVoteStatus();
          fetchDashboardData(); // Refresh NX balance too
        }, 3000); // Wait 3 seconds for webhook to process
      }
    }, 1000);

    // Remove pending status after 30 seconds regardless
    setTimeout(() => {
      setVoteData(prev => ({
        ...prev,
        voteStatus: {
          ...prev.voteStatus,
          [siteKey]: { ...prev.voteStatus[siteKey], pending: false }
        }
      }));
      // Also refresh status in case webhook already processed
      fetchVoteStatus();
      fetchDashboardData();
    }, 30000);
  };

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Check if user is logged in and get username
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.isLoggedIn) {
        // Fetch real data from database
        fetchDashboardData();
        fetchAnnouncements();
      } else {
        window.location.href = '/auth';
      }
    } else {
      window.location.href = '/auth';
    }
  }, []);

  // Fetch vote status when userData changes
  useEffect(() => {
    if (userData.username !== "Loading...") {
      fetchVoteStatus();
    }
  }, [userData.username]);

  // Refresh data when tab changes to characters or rankings (if no data)
  useEffect(() => {
    if ((activeTab === 'characters' && characters.length === 0) || 
        (activeTab === 'rankings' && rankings.length === 0)) {
      fetchDashboardData();
    }
  }, [activeTab]);

  // Auto-refresh navigation stats every 30 seconds
  useEffect(() => {
    let navigationStatsInterval: NodeJS.Timeout;

    if (userData.username !== "Loading...") {
      navigationStatsInterval = setInterval(async () => {
        // Just update navigation stats without loading states
        const response = await dashboardAPI.getStats();
        if (response.ok) {
          const data = response.data;
          setUserData(prev => ({
            ...prev,
            nx: data.user.nx,
            votePoints: data.user.votePoints,
            level: data.mainCharacter?.level || prev.level,
            job: data.mainCharacter?.job || prev.job
          }));
          setOnlineCount(data.onlineCount);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (navigationStatsInterval) {
        clearInterval(navigationStatsInterval);
      }
    };
  }, [userData.username]);

  // Auto-refresh data when window becomes visible (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userData.username !== "Loading...") {
        fetchDashboardData();
        fetchVoteStatus();
        fetchAnnouncements();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData.username]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'characters', label: 'My Characters', icon: User },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
    { id: 'download', label: 'Download', icon: Download }
  ];

  const downloadSteps = [
    { step: 1, title: 'Download Client', description: 'Download the MapleKaede game client (1.2GB)', icon: Download },
    { step: 2, title: 'Extract Files', description: 'Extract the ZIP file to your desired location', icon: Shield },
    { step: 3, title: 'Run Setup', description: 'Run MapleKaede.exe as administrator', icon: Settings },
    { step: 4, title: 'Start Playing!', description: 'Launch the game and login with your account', icon: Gamepad2 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 fixed top-0 w-full z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Side - Logo */}
            <div className="flex items-center flex-shrink-0">
              <div className="group relative flex items-center gap-3 cursor-pointer">
                {/* Logo Icon */}
                <div className="relative">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-orange-500 font-black text-sm">
                        {(process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleKaede')[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-orange-400/30 rounded-xl blur-lg -z-10 group-hover:blur-xl transition-all duration-300" />
                </div>
                
                {/* Server Name */}
                <div className="relative">
                  <h1 className="text-xl font-black tracking-tight group-hover:scale-105 transition-transform duration-300">
                    {(() => {
                      const serverName = process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleKaede';
                      if (serverName.toLowerCase().startsWith('maple')) {
                        const maple = serverName.slice(0, 5);
                        const rest = serverName.slice(5);
                        return (
                          <>
                            <span className="text-gray-800">{maple}</span>
                            <span className="text-orange-500">{rest}</span>
                          </>
                        );
                      }
                      return (
                        <span className="text-orange-500">{serverName}</span>
                      );
                    })()}
                  </h1>
                  <div className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-500" />
                </div>
              </div>
            </div>
            
            {/* Center Navigation - Orange Only */}
            <div className="flex-1 flex justify-center">
              <nav className="hidden md:flex items-center bg-gray-50 rounded-2xl p-1.5 shadow-lg border border-gray-200/50 backdrop-blur-sm">
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${
                      activeTab === item.id
                        ? 'bg-orange-500 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50 hover:scale-102'
                    } ${index !== menuItems.length - 1 ? 'mr-1' : ''}`}
                  >
                    {/* Background glow effect for active tab */}
                    {activeTab === item.id && (
                      <div className="absolute inset-0 bg-orange-400/20 blur-xl -z-10" />
                    )}
                    
                    {/* Hover shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <item.icon className={`relative z-10 w-4 h-4 transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'text-white group-hover:scale-110 group-hover:rotate-12' 
                        : 'text-gray-500 group-hover:text-orange-500 group-hover:scale-110'
                    }`} />
                    <span className="relative z-10">{item.label}</span>
                    
                    {/* Active indicator dot */}
                    {activeTab === item.id && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full shadow-md animate-pulse" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Right Side - Stats & Profile - Orange Theme */}
            <div className="flex items-center gap-3 flex-shrink-0">
              
              {/* Online Count */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200/50 shadow-sm">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-green-700 text-sm font-bold">{onlineCount}</span>
                <span className="text-green-600 text-xs font-medium">online</span>
              </div>
              
              {/* NX Balance */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-200/50 shadow-sm">
                <Star className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700 text-sm font-bold">{userData.nx.toLocaleString()}</span>
                <span className="text-orange-600 text-xs font-medium">NX</span>
              </div>
              
              {/* Profile Button - Orange Theme */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="group flex items-center gap-3 p-1.5 rounded-2xl hover:bg-orange-50 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-orange-200/50"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{userData.username}</div>
                    <div className="text-xs text-gray-500 group-hover:text-orange-500 transition-colors">Lv.{userData.level} • {userData.job}</div>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      {userData.username[0]?.toUpperCase()}
                    </div>
                    {/* Profile glow effect */}
                    <div className="absolute inset-0 bg-orange-400/30 rounded-xl blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                </button>

                {/* Profile Dropdown - Orange Theme */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden transform transition-all duration-300">
                    {/* Header with orange background */}
                    <div className="relative p-4 bg-orange-500 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-pulse" />
                      <div className="relative z-10">
                        <p className="font-bold text-white text-lg">{userData.username}</p>
                        <p className="text-white/90 text-sm">{userData.job} • Level {userData.level}</p>
                        <div className="flex items-center gap-4 mt-2 text-white/80 text-xs">
                          <span>Guild: {userData.guild}</span>
                          <span>NX: {userData.nx.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu items */}
                    <div className="p-2">
                      {isAdmin && (
                        <button 
                          onClick={() => window.location.href = '/admin'}
                          className="w-full flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-300 group"
                        >
                          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                          <span className="font-medium">Admin Panel</span>
                          <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          localStorage.removeItem('user');
                          window.location.href = '/auth';
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 group"
                      >
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Logout</span>
                        <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile Menu Button - Orange Theme */}
              <button className="md:hidden p-2.5 rounded-xl hover:bg-orange-50 transition-all duration-300 group border border-transparent hover:border-orange-200/50">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Mobile Navigation - Orange Only */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50">
          <div className="px-4 py-3">
            <div className="flex justify-around">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex flex-col items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all duration-300 ${
                    activeTab === item.id
                      ? 'text-white bg-orange-500 shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {/* Background glow for active mobile tab */}
                  {activeTab === item.id && (
                    <div className="absolute inset-0 bg-orange-400/30 blur-lg -z-10 rounded-xl" />
                  )}
                  
                  <item.icon className={`w-5 h-5 transition-all duration-300 ${
                    activeTab === item.id 
                      ? 'text-white group-hover:scale-110' 
                      : 'text-gray-400 group-hover:text-orange-500 group-hover:scale-110'
                  }`} />
                  <span className={`text-xs font-bold transition-colors ${
                    activeTab === item.id ? 'text-white' : 'text-gray-600 group-hover:text-orange-600'
                  }`}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator for mobile */}
                  {activeTab === item.id && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section for Characters */}
        {activeTab === 'characters' && (
          <div className="relative h-72 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <Image
                src="/assets/testt.jpg"
                alt="Background"
                fill
                className="object-cover scale-105 transition-transform duration-[15s] ease-out"
                priority
                quality={100}
              />
            </div>
            
            {/* Orange/Red/Pink Theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-red-500/40 to-pink-500/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,165,0,0.3),transparent_70%)]" />
            
            {/* Character-themed Particle System */}
            <div className="absolute inset-0">
              <div className="absolute top-24 right-28 w-12 h-12 border-2 border-purple-300/30 rounded-full animate-spin-slow" />
              <div className="absolute bottom-28 left-20 w-8 h-8 bg-indigo-400/20 rotate-45 animate-pulse" />
              <div className="absolute top-32 left-1/3 w-6 h-6 bg-blue-400/30 rounded-full animate-ping animation-delay-1000" />
              
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-gradient-to-br from-purple-400/20 to-indigo-400/15 rounded-full blur-3xl animate-blob" />
              <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-gradient-to-br from-blue-400/15 to-purple-400/20 rounded-full blur-3xl animate-blob animation-delay-3000" />
            </div>
            
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl -m-6" />
                  <div className="relative z-10 p-6">
                    <h1 className="text-5xl font-black mb-3 drop-shadow-2xl">
                      <span className="text-white animate-fadeInUp">
                        Choose Your Hero
                      </span>
                    </h1>
                    <p className="text-xl text-white font-bold mb-6 animate-fadeInUp animation-delay-500 drop-shadow-lg">
                      Select your character and continue your <span className="text-yellow-300 font-black">legendary adventure</span>
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4 animate-fadeInUp animation-delay-1000">
                      <div className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform">
                        <User className="w-5 h-5" />
                        {characters.length} Characters
                      </div>
                      <div className="px-6 py-3 bg-gradient-to-r from-orange-500/80 to-pink-500/80 text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform">
                        <Crown className="w-5 h-5" />
                        Highest: Level {characters.length > 0 ? Math.max(...characters.map(char => char.level)) : 1}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0 pointer-events-none">
              <User className="absolute top-16 right-20 w-7 h-7 text-orange-300/40 animate-pulse animation-delay-500" />
              <Crown className="absolute bottom-20 left-16 w-9 h-9 text-yellow-400/30 animate-float animation-delay-2000" />
              <Shield className="absolute top-28 left-20 w-6 h-6 text-pink-300/40 animate-bounce-slow animation-delay-1500" />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />
          </div>
        )}

        {/* Hero Section for Rankings */}
{activeTab === 'rankings' && (
  <div className="relative h-72 overflow-hidden">
    <div className="absolute inset-0 z-0">
      <Image
        src="/assets/testt.jpg"
        alt="Background"
        fill
        className="object-cover scale-105 transition-transform duration-[25s] ease-out"
        priority
        quality={100}
      />
    </div>
    
    {/* Orange/Red/Pink Theme */}
    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-red-500/40 to-pink-500/60" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,165,0,0.3),transparent_70%)]" />
    
    {/* Rankings-themed Effects */}
    <div className="absolute inset-0">
      <div className="absolute top-22 right-30 w-12 h-12 border border-orange-300/30 rounded-lg rotate-12 animate-spin-slow" />
      <div className="absolute bottom-26 left-22 w-10 h-10 bg-red-400/20 rounded-full animate-pulse animation-delay-1000" />
      <div className="absolute top-28 left-1/4 w-6 h-6 bg-pink-400/30 rotate-45 animate-bounce-slow animation-delay-500" />
      
      <div className="absolute -top-8 -right-8 w-38 h-38 bg-gradient-to-br from-orange-400/20 to-red-400/15 rounded-full blur-3xl animate-blob" />
      <div className="absolute -bottom-8 -left-8 w-42 h-42 bg-gradient-to-br from-pink-400/15 to-orange-400/20 rounded-full blur-3xl animate-blob animation-delay-3500" />
    </div>
    
    <div className="relative z-10 h-full flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl -m-6" />
          <div className="relative z-10 p-6">
            <h1 className="text-5xl font-black mb-3 drop-shadow-2xl">
              <span className="text-white animate-fadeInUp">
                Server Rankings
              </span>
            </h1>
            <p className="text-xl text-white font-bold mb-6 animate-fadeInUp animation-delay-500 drop-shadow-lg">
              Compete with the <span className="text-yellow-300 font-black">best players</span> in MapleKaede
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 animate-fadeInUp animation-delay-1000">
              <div className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5" />
                Your Rank: #{userRanking ? userRanking.rank : 'Unranked'}
              </div>
              <div className="px-6 py-3 bg-gradient-to-r from-orange-500/80 to-pink-500/80 text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform">
                <Crown className="w-5 h-5" />
                Top Player: Level {rankings.length > 0 ? rankings[0].level : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="absolute inset-0 pointer-events-none">
      <Trophy className="absolute top-16 right-22 w-7 h-7 text-orange-300/40 animate-pulse animation-delay-600" />
      <Crown className="absolute bottom-20 left-20 w-9 h-9 text-yellow-400/30 animate-float animation-delay-1800" />
      <Star className="absolute top-30 left-18 w-6 h-6 text-pink-300/40 animate-spin-slow animation-delay-1200" />
    </div>
    
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />
  </div>
)}

        {/* Hero Section for Download */}
        {activeTab === 'download' && (
          <div className="relative h-72 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <Image
                src="/assets/testt.jpg"
                alt="Background"
                fill
                className="object-cover scale-105 transition-transform duration-[18s] ease-out"
                priority
                quality={100}
              />
            </div>
            
            {/* Orange/Red/Pink Theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-red-500/40 to-pink-500/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,165,0,0.3),transparent_70%)]" />
            
            {/* Download-themed Effects */}
            <div className="absolute inset-0">
              <div className="absolute top-22 right-30 w-12 h-12 border border-emerald-300/30 rounded-lg rotate-12 animate-spin-slow" />
              <div className="absolute bottom-26 left-22 w-10 h-10 bg-teal-400/20 rounded-full animate-pulse animation-delay-1000" />
              <div className="absolute top-28 left-1/4 w-6 h-6 bg-cyan-400/30 rotate-45 animate-bounce-slow animation-delay-500" />
              
              <div className="absolute -top-8 -right-8 w-38 h-38 bg-gradient-to-br from-emerald-400/20 to-teal-400/15 rounded-full blur-3xl animate-blob" />
              <div className="absolute -bottom-8 -left-8 w-42 h-42 bg-gradient-to-br from-cyan-400/15 to-emerald-400/20 rounded-full blur-3xl animate-blob animation-delay-3500" />
            </div>
            
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl -m-6" />
                  <div className="relative z-10 p-6">
                    <h1 className="text-5xl font-black mb-3 drop-shadow-2xl">
                      <span className="text-white animate-fadeInUp">
                        Download MapleKaede
                      </span>
                    </h1>
                    <p className="text-xl text-white font-bold mb-6 animate-fadeInUp animation-delay-500 drop-shadow-lg">
                      Get started in just a <span className="text-yellow-300 font-black">few minutes</span>!
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4 animate-fadeInUp animation-delay-1000">
                      <div className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform">
                        <Download className="w-5 h-5" />
                        Version 83
                      </div>
                      <div className="px-6 py-3 bg-gradient-to-r from-orange-500/80 to-pink-500/80 text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform">
                        <Shield className="w-5 h-5" />
                        1.2GB Download
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0 pointer-events-none">
              <Download className="absolute top-16 right-22 w-7 h-7 text-orange-300/40 animate-pulse animation-delay-600" />
              <Gamepad2 className="absolute bottom-20 left-20 w-9 h-9 text-yellow-400/30 animate-float animation-delay-1800" />
              <Settings className="absolute top-30 left-18 w-6 h-6 text-pink-300/40 animate-spin-slow animation-delay-1200" />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />
          </div>
        )}

       {/* Hero Section for Overview */}
      {activeTab === 'overview' && (
        <div className="relative h-72 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/assets/testt.jpg"
              alt="Background"
              fill
              className="object-cover scale-105 transition-transform duration-[20s] ease-out"
              priority
              quality={100}
            />
          </div>
          
          {/* Orange/Red/Pink Theme */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-red-500/40 to-pink-500/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,165,0,0.3),transparent_70%)]" />
          
          {/* Overview-themed Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-22 right-30 w-12 h-12 border border-orange-300/30 rounded-lg rotate-12 animate-spin-slow" />
            <div className="absolute bottom-26 left-22 w-10 h-10 bg-red-400/20 rounded-full animate-pulse animation-delay-1000" />
            <div className="absolute top-28 left-1/4 w-6 h-6 bg-pink-400/30 rotate-45 animate-bounce-slow animation-delay-500" />
            
            <div className="absolute -top-8 -right-8 w-38 h-38 bg-gradient-to-br from-orange-400/20 to-red-400/15 rounded-full blur-3xl animate-blob" />
            <div className="absolute -bottom-8 -left-8 w-42 h-42 bg-gradient-to-br from-pink-400/15 to-orange-400/20 rounded-full blur-3xl animate-blob animation-delay-3500" />
          </div>
          
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl -m-6" />
                <div className="relative z-10 p-6">
                  <h1 className="text-5xl font-black mb-3 drop-shadow-2xl">
                    <span className="text-white animate-fadeInUp">
                      Welcome Back
                    </span>
                  </h1>
                  <p className="text-xl text-white font-bold mb-6 animate-fadeInUp animation-delay-500 drop-shadow-lg">
                    Ready for your next <span className="text-yellow-300 font-black">epic adventure</span>, {userData.username}?
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-4 animate-fadeInUp animation-delay-1000">
                    <button 
                      onClick={() => setActiveTab('download')}
                      className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      Play Now
                    </button>
                    <button 
                      onClick={() => setShowVoteModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500/80 to-pink-500/80 text-white rounded-2xl font-bold flex items-center gap-3 border border-white/30 hover:scale-105 transition-transform"
                    >
                      <Heart className="w-5 h-5" />
                      Vote for NX
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 pointer-events-none">
            <Home className="absolute top-16 right-22 w-7 h-7 text-orange-300/40 animate-pulse animation-delay-600" />
            <Star className="absolute bottom-20 left-20 w-9 h-9 text-yellow-400/30 animate-float animation-delay-1800" />
            <Trophy className="absolute top-30 left-18 w-6 h-6 text-pink-300/40 animate-spin-slow animation-delay-1200" />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />
        </div>
      )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Quick Stats - Redesigned */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Players Online */}
                  <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 rounded-full">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-orange-700">LIVE</span>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-1">{onlineCount}</h3>
                      <p className="text-orange-700 font-semibold text-sm">Players Online</p>
                    </div>
                  </div>

                  {/* Active Events */}
                  <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-500/20 px-2 py-1 rounded-full">ACTIVE</span>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-1">{announcements.filter(a => a.type === 'event').length}</h3>
                      <p className="text-orange-700 font-semibold text-sm">Active Events</p>
                    </div>
                  </div>

                  {/* Your Ranking */}
                  <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <Crown className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-1">#{userRanking ? userRanking.rank : 'N/A'}</h3>
                      <p className="text-orange-700 font-semibold text-sm">Your Ranking</p>
                    </div>
                  </div>

                  {/* Server Uptime */}
                  <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-md" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-1">99.9%</h3>
                      <p className="text-orange-700 font-semibold text-sm">Server Uptime</p>
                    </div>
                  </div>
                </div>

                {/* News & Events - Redesigned */}
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl blur-lg opacity-30"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">Latest News & Events</h2>
                        <p className="text-gray-600 text-sm">Stay updated with the latest happenings</p>
                      </div>
                    </div>
                    <button className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105">
                      View All 
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {announcements.length === 0 ? (
                      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 p-12 text-center">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-400"></div>
                        <div className="relative z-10">
                          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Bell className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-700 mb-2">No announcements at the moment</h3>
                          <p className="text-gray-500">Check back later for exciting updates and events!</p>
                        </div>
                      </div>
                    ) : (
                      announcements.map((item, index) => (
                        <div key={item.id} className="group relative overflow-hidden bg-white rounded-3xl border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                          {/* Orange accent bar */}
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-500 to-orange-400" />
                          
                          {/* Animated background effects */}
                          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-10 bg-orange-500" />
                          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-xl opacity-10 bg-orange-400" />
                          
                          <div className="relative p-8">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 pr-6">
                                {/* Enhanced type badge and date */}
                                <div className="flex items-center gap-4 mb-6">
                                  <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold border-2 bg-orange-50 text-orange-700 border-orange-200">
                                    {item.type.toUpperCase()}
                                  </span>
                                  <span className="text-sm text-gray-500 font-medium">{item.date}</span>
                                </div>
                                
                                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors leading-tight">
                                  {item.title}
                                </h3>
                                <p className="text-gray-600 mb-6 leading-relaxed text-lg">{item.description}</p>
                                
                                {item.time && (
                                  <div className="inline-flex items-center gap-3 px-4 py-3 bg-orange-50 rounded-2xl border-2 border-orange-200 mb-6">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                    <span className="text-orange-700 font-bold">{item.time}</span>
                                  </div>
                                )}
                                
                                <button className="group/btn inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105">
                                  Read More 
                                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                              </div>
                              
                              {/* Enhanced event icon */}
                              <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 bg-gradient-to-br from-orange-500 to-orange-400">
                                {item.type === 'event' && <Sparkles className="w-10 h-10 text-white" />}
                                {item.type === 'maintenance' && <Settings className="w-10 h-10 text-white" />}
                                {item.type === 'update' && <Star className="w-10 h-10 text-white" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
            </div>
          )}

          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                  My Characters
                  <button
                    onClick={refreshData}
                    className="p-2 rounded-xl hover:bg-orange-50 transition-colors group"
                    title="Refresh Characters"
                  >
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transition-colors transform group-hover:rotate-90" />
                  </button>
                </h1>
                <p className="text-gray-600">Choose your hero and continue your adventure</p>
                <p className="text-sm text-gray-500 mt-2">Data refreshes when you reload the page or switch tabs</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading characters...</span>
                </div>
              ) : characters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg mb-4">No characters found</p>
                  <p className="text-gray-500">Create your first character in-game to see it here!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {characters.map((char, index) => {
                    console.log(`Character ${char.name} data:`, {
                      id: char.id,
                      name: char.name,
                      skincolor: char.skincolor,
                      gender: char.gender,
                      hair: char.hair,
                      face: char.face,
                      equipment: char.equipment
                    });

                    // Ensure character data is properly formatted with null-safe defaults
                    const characterData = {
                      id: char.id,
                      name: char.name || 'Unknown',
                      level: char.level || 1,
                      job: char.job || 'Beginner',
                      skincolor: char.skincolor ?? 0,  // Use nullish coalescing to handle 0 values
                      gender: char.gender ?? 0,
                      hair: char.hair || 30000,
                      face: char.face || 20000,
                      equipment: char.equipment || {},
                      stats: char.stats || { str: 4, dex: 4, int: 4, luk: 4 },
                      exp: char.exp || 0,
                      meso: char.meso || 0
                    };

                    // Validate that we have minimum required data
                    const hasRequiredData = (
                      characterData.skincolor !== undefined && 
                      characterData.skincolor !== null &&
                      characterData.gender !== undefined && 
                      characterData.gender !== null
                    );

                    return (
                      <div key={char.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                      {/* Character Display Area - Much Bigger */}
                      <div className="h-64 relative flex items-center justify-center overflow-hidden">
                        {/* Main container with background image */}
                        <div 
                          className="relative overflow-hidden rounded-xl shadow-xl"
                          style={{
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          {/* Background Image with full controls */}
                          <div 
                            className="absolute inset-0"
                            style={{
                              backgroundImage: 'url("/assets/character-bg.jpg")',
                              backgroundSize: '300%',
                              backgroundPosition: 'center calc(80% + 40px)',
                              backgroundRepeat: 'no-repeat',
                              transform: 'scale(1)',
                              transformOrigin: 'center',
                              filter: 'none', 
                            }}
                          />
                          
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/10 via-transparent to-orange-100/10">
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute top-4 left-4 w-16 h-16 bg-orange-200 rounded-full blur-xl"></div>
                              <div className="absolute bottom-4 right-4 w-20 h-20 bg-amber-200 rounded-full blur-xl"></div>
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-300 rounded-full blur-2xl opacity-30"></div>
                            </div>
                          </div>
                          
                          {/* Character Sprite - Larger */}
                          <div className="relative z-10 scale-110 flex items-center justify-center h-full">
                            {hasRequiredData ? (
                              <CharacterRenderer 
                                character={characterData}
                                scale={1.8}
                              />
                            ) : (
                              <div className="w-[360px] h-[360px] flex flex-col items-center justify-center text-gray-400">
                                <User className="w-16 h-16 mb-2" />
                                <span className="text-sm">Character loading...</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Level Badge - Repositioned */}
                          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-white/20 z-20">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className="text-orange-600 font-bold text-sm">Lv. {characterData.level}</span>
                            </div>
                          </div>
                          
                          {/* Job Badge */}
                          <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-orange-600 rounded-lg font-medium text-sm border border-orange-200 z-20">
                            {characterData.job}
                          </div>
                        </div>
                      </div>

                        {/* Character Info */}
                        <div className="p-6">
                          <div className="mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{characterData.name}</h3>
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{characterData.job}</span>
                            </div>
                          </div>
                          
                          {/* EXP Progress */}
                          <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-600 text-sm font-medium">EXP Progress</span>
                              <span className="text-gray-900 font-bold">{characterData.exp}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 shadow-sm"
                                style={{ width: `${characterData.exp}%` }}
                              />
                            </div>
                          </div>

                          {/* Equipment Preview - Improved */}
                          {characterData.equipment && Object.keys(characterData.equipment).length > 0 && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-semibold text-gray-700">Equipment</span>
                              </div>
                              <div className="grid grid-cols-4 gap-3">
                                {(Object.entries(characterData.equipment) as [keyof CharacterEquipment, number][])
                                  .filter(([_, itemId]) => itemId && itemId > 0)
                                  .map(([type, itemId]) => {
                                    // Equipment slot mapping
                                    const equipmentInfo: { [key: string]: { folder: string; label: string; prefix?: string } } = {
                                      cap: { folder: 'Cap', label: 'Hat', prefix: '0' },
                                      coat: { folder: itemId >= 1050000 ? 'Longcoat' : 'Coat', label: 'Top', prefix: '0' },
                                      pants: { folder: 'Pants', label: 'Bottom', prefix: '0' },
                                      shoes: { folder: 'Shoes', label: 'Shoes', prefix: '0' },
                                      glove: { folder: 'Glove', label: 'Gloves', prefix: '0' },
                                      cape: { folder: 'Cape', label: 'Cape', prefix: '0' },
                                      shield: { folder: 'Shield', label: 'Shield', prefix: '0' },
                                      weapon: { folder: 'Weapon', label: 'Weapon', prefix: '' },
                                      mask: { folder: 'Accessory', label: 'Face', prefix: '0' },
                                      eyes: { folder: 'Accessory', label: 'Eyes', prefix: '0' },
                                      ears: { folder: 'Accessory', label: 'Earring', prefix: '0' }
                                    };
                                    
                                    const info = equipmentInfo[type];
                                    if (!info) return null;

                                    // Format item ID with proper padding and prefix
                                    let formattedId: string;
                                    if (info.prefix) {
                                      formattedId = `${info.prefix}${itemId.toString().padStart(7, '0')}`;
                                    } else {
                                      // For weapons (no prefix)
                                      formattedId = itemId.toString().padStart(8, '0');
                                    }
                                    
                                    const iconPath = `/assets/maplestory/${info.folder}/${formattedId}.img/info.icon.png`;
                                    
                                    return (
                                      <div key={type} className="relative group">
                                        {/* Item slot container - Larger */}
                                        <div className="relative w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-300 overflow-hidden transition-all hover:border-orange-400 hover:shadow-lg hover:scale-105">
                                          {/* Item icon */}
                                          <img 
                                            src={iconPath}
                                            alt={info.label}
                                            className="absolute inset-0 w-full h-full object-contain p-1.5"
                                            onError={(e) => {
                                              // Fallback to text if icon doesn't exist
                                              const img = e.currentTarget as HTMLImageElement;
                                              img.style.display = 'none';
                                              const nextElement = img.nextElementSibling as HTMLElement;
                                              if (nextElement) {
                                                nextElement.classList.remove('hidden');
                                              }
                                            }}
                                          />
                                          {/* Fallback text */}
                                          <div className="hidden absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {type.substring(0, 2).toUpperCase()}
                                          </div>
                                          
                                          {/* Equipped indicator */}
                                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                        </div>
                                        
                                        {/* Tooltip - Improved */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                          <div className="font-semibold">{info.label}</div>
                                          <div className="text-gray-300 text-xs">ID: {itemId}</div>
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                            <div className="border-4 border-transparent border-t-gray-900"></div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Meso Display - Improved */}
                          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">M</span>
                                </div>
                                <span className="text-yellow-800 font-semibold">Meso</span>
                              </div>
                              <span className="text-yellow-900 font-bold text-lg">{characterData.meso.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Stats Grid - Improved */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                              <p className="text-red-600 text-xs font-semibold mb-1">STR</p>
                              <p className="text-red-800 font-bold text-lg">{characterData.stats.str}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                              <p className="text-green-600 text-xs font-semibold mb-1">DEX</p>
                              <p className="text-green-800 font-bold text-lg">{characterData.stats.dex}</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                              <p className="text-blue-600 text-xs font-semibold mb-1">INT</p>
                              <p className="text-blue-800 font-bold text-lg">{characterData.stats.int}</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                              <p className="text-purple-600 text-xs font-semibold mb-1">LUK</p>
                              <p className="text-purple-800 font-bold text-lg">{characterData.stats.luk}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rankings Tab */}
          {activeTab === 'rankings' && (
            <div className="space-y-8 pb-32">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                  Server Rankings
                  <button
                    onClick={refreshData}
                    className="p-2 rounded-xl hover:bg-orange-50 transition-colors group"
                    title="Refresh Rankings"
                  >
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transition-colors transform group-hover:rotate-90" />
                  </button>
                </h1>
                <p className="text-gray-600">Compete with the best players in MapleKaede</p>
                <p className="text-sm text-gray-500 mt-2">Ranked by Level, then by EXP • Refreshes on page reload • Hover over players to see their character</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading rankings...</span>
                </div>
              ) : (
                <>
                  {/* Enhanced Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                      <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-orange-700 bg-orange-500/20 px-2 py-1 rounded-full">TOP</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">Champion</h3>
                        <p className="text-orange-700 font-semibold text-sm mb-2">Top Player</p>
                        {rankings.length > 0 ? (
                          <div>
                            <p className="text-lg font-bold text-gray-900">{rankings[0].name}</p>
                            <p className="text-orange-600 text-sm">Level {rankings[0].level}</p>
                          </div>
                        ) : (
                          <p className="text-orange-600 text-sm">No data</p>
                        )}
                      </div>
                    </div>

                    <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                      <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <TrendingUp className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-orange-700 bg-orange-500/20 px-2 py-1 rounded-full">YOU</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">Your Rank</h3>
                        <p className="text-orange-700 font-semibold text-sm mb-2">Current Position</p>
                        {userRanking ? (
                          <div>
                            <p className="text-lg font-bold text-gray-900">#{userRanking.rank}</p>
                            <p className="text-orange-600 text-sm">Level {userRanking.level}</p>
                          </div>
                        ) : rankings.find(r => r.isCurrentUser) ? (
                          <div>
                            <p className="text-lg font-bold text-orange-600">Top 100!</p>
                            <p className="text-orange-600 text-sm">In leaderboard</p>
                          </div>
                        ) : (
                          <p className="text-orange-600 text-sm">Not ranked</p>
                        )}
                      </div>
                    </div>

                    <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                      <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-orange-700 bg-orange-500/20 px-2 py-1 rounded-full">TOTAL</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">{rankings.length}</h3>
                        <p className="text-orange-700 font-semibold text-sm mb-2">Total Players</p>
                        {rankings.length > 0 && (
                          <p className="text-orange-600 text-sm">
                            Avg: Lv.{Math.round(rankings.reduce((sum, r) => sum + r.level, 0) / rankings.length)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                      <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <Star className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-orange-700 bg-orange-500/20 px-2 py-1 rounded-full">MAX</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">
                          {rankings.length > 0 ? rankings[0].level : 'N/A'}
                        </h3>
                        <p className="text-orange-700 font-semibold text-sm mb-2">Highest Level</p>
                        {rankings.length > 0 && (
                          <p className="text-orange-600 text-sm">
                            {Math.round((rankings[0].level / 200) * 100)}% to cap
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rankings Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-32">
                    <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-6 h-6 text-orange-500" />
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Top Players</h2>
                            <p className="text-sm text-gray-600">Hover over players to see their character</p>
                          </div>
                        </div>
                        {userRanking && (
                          <span className="text-sm text-orange-600 bg-orange-100 px-4 py-2 rounded-full font-medium">
                            Your Rank: #{userRanking.rank}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="w-20 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Rank</th>
                            <th className="w-56 px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Player</th>
                            <th className="w-20 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Level</th>
                            <th className="w-32 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Job</th>
                            <th className="w-32 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Guild</th>
                            <th className="w-24 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Fame</th>
                            <th className="w-24 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">EXP</th>
                            <th className="w-28 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Character</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {rankings.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-4">
                                  <Trophy className="w-12 h-12 text-gray-300" />
                                  <div>
                                    <p className="text-lg font-medium">No ranking data available</p>
                                    <p className="text-sm">Rankings will appear here once characters are created</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            rankings.map((player, index) => (
                              <tr 
                                key={player.id} 
                                className={`hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent transition-all duration-200 cursor-pointer ${
                                  player.isCurrentUser ? 'bg-gradient-to-r from-orange-50 to-orange-25 border-l-4 border-orange-400' : ''
                                }`}
                                onMouseEnter={() => handleMouseEnter(player)}
                                onMouseLeave={handleMouseLeave}
                                onMouseMove={handleMouseMove}
                              >
                                {/* Rank */}
                                <td className="w-20 px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {player.rank <= 3 && (
                                      <Crown className={`w-4 h-4 ${
                                        player.rank === 1 ? 'text-yellow-500' :
                                        player.rank === 2 ? 'text-gray-400' :
                                        'text-orange-600'
                                      }`} />
                                    )}
                                    <span className={`font-bold ${
                                      player.isCurrentUser ? 'text-orange-600' : 'text-gray-900'
                                    }`}>
                                      #{player.rank}
                                    </span>
                                  </div>
                                </td>

                                {/* Player */}
                                <td className="w-56 px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                      player.isCurrentUser 
                                        ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
                                        : player.rank <= 3
                                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                    }`}>
                                      {player.name[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className={`font-bold truncate ${
                                        player.isCurrentUser ? 'text-orange-600' : 'text-gray-900'
                                      }`}>
                                        {player.name}
                                      </p>
                                      {player.isCurrentUser && (
                                        <p className="text-xs text-orange-600 font-medium">(You)</p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Level */}
                                <td className="w-20 px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className={`text-lg font-bold ${
                                      player.isCurrentUser ? 'text-orange-600' : 'text-gray-900'
                                    }`}>
                                      {player.level}
                                    </span>
                                    {player.level >= 200 && (
                                      <Star className="w-4 h-4 text-yellow-500" />
                                    )}
                                  </div>
                                </td>

                                {/* Job */}
                                <td className="w-32 px-4 py-4 text-center">
                                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 truncate max-w-full">
                                    {player.job}
                                  </span>
                                </td>

                                {/* Guild */}
                                <td className="w-32 px-4 py-4 text-center">
                                  {player.guild ? (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 truncate max-w-full">
                                      {player.guild}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs font-medium">No Guild</span>
                                  )}
                                </td>

                                {/* Fame */}
                                <td className="w-24 px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Heart className="w-3 h-3 text-pink-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 truncate">{player.fame.toLocaleString()}</span>
                                  </div>
                                </td>

                                {/* EXP */}
                                <td className="w-24 px-4 py-4 text-center">
                                  <span className="text-xs font-mono text-gray-600 truncate block">
                                    {player.exp.toLocaleString()}
                                  </span>
                                </td>

                                {/* Character */}
                                <td className="w-28 px-4 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors">
                                      <User className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <span className="text-xs text-gray-500">Hover</span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Character Hover Tooltip - Outside table */}
                  <div 
                    ref={tooltipRef}
                    className="fixed opacity-0 transition-opacity duration-300 pointer-events-none z-[9999]"
                    style={{
                      left: '0px',
                      top: '0px',
                      transform: 'none'
                    }}>
                    {hoveredPlayer && (
                      <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 p-4 min-w-[280px]">
                        <div className="flex items-center gap-4">
                          {/* Character Renderer with Background */}
                          <div className="flex-shrink-0 relative overflow-hidden rounded-xl border border-orange-200" 
                            style={{
                              width: '200px',  // Fixed width
                              height: '250px', // Taller height to show more of the scene
                            }}
                          >
                            {/* Background Image - No blur overlay */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                backgroundImage: 'url("/assets/character-bg.jpg")',
                                backgroundSize: '350%',
                                backgroundPosition: 'center calc(62% - 70px)', // Adjust to show the ground area
                                backgroundRepeat: 'no-repeat',
                                transform: 'scale(1)',
                                transformOrigin: 'center',
                              }}
                            />
                            
                            {/* Character Renderer positioned at bottom */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 flex justify-center"
                              style={{
                                // Fine-tune the exact ground position
                                paddingBottom: '30px', // Adjust this to place character exactly on the ground
                                // OR use transform for more precise control:
                                // transform: 'translateY(-10px)', // Negative value to lift character up from bottom
                              }}
                            >
                              <CharacterRenderer 
                                character={{
                                  id: hoveredPlayer.id,
                                  name: hoveredPlayer.name,
                                  level: hoveredPlayer.level,
                                  job: hoveredPlayer.job,
                                  skincolor: hoveredPlayer.skincolor || 0,
                                  gender: hoveredPlayer.gender || 0,
                                  hair: hoveredPlayer.hair || 30000,
                                  face: hoveredPlayer.face || 20000,
                                  equipment: hoveredPlayer.equipment || {},
                                  stats: hoveredPlayer.stats || { str: 4, dex: 4, int: 4, luk: 4 },
                                  exp: hoveredPlayer.exp || 0,
                                  meso: hoveredPlayer.meso || 0
                                }}
                                scale={1.2}
                              />
                            </div>
                          </div>
                          
                          {/* Character Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {hoveredPlayer.rank <= 3 && (
                                <Crown className={`w-5 h-5 ${
                                  hoveredPlayer.rank === 1 ? 'text-yellow-500' :
                                  hoveredPlayer.rank === 2 ? 'text-gray-400' :
                                  'text-orange-600'
                                }`} />
                              )}
                              <h3 className="font-bold text-gray-900 text-lg">{hoveredPlayer.name}</h3>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-16 text-gray-500">Level:</span>
                                <span className="font-semibold text-orange-600">{hoveredPlayer.level}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 text-gray-500">Job:</span>
                                <span className="font-medium text-gray-700">{hoveredPlayer.job}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 text-gray-500">Guild:</span>
                                {hoveredPlayer.guild ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    {hoveredPlayer.guild}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">No Guild</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 text-gray-500">Fame:</span>
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 text-pink-500" />
                                  <span className="font-medium text-gray-700">{hoveredPlayer.fame.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                          
                          {/* Show user's ranking separately if not in top 100 */}
                          {userRanking && userRanking.rank > 100 && (
                            <>
                              <tr>
                                <td colSpan={8} className="px-6 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2 text-gray-400">
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-xs px-3 py-1 bg-gray-100 rounded-full">...</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                  </div>
                                </td>
                              </tr>
                              <tr className="bg-gradient-to-r from-orange-50 to-orange-25 border-l-4 border-orange-400 group hover:from-orange-100 hover:to-orange-50">
                                {/* Character Hover Tooltip for user ranking */}
                                <td className="fixed opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[9999]"
                                  style={{
                                    left: '50%',
                                    top: '20px',
                                    transform: 'translateX(-50%)'
                                  }}>
                                  <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 p-4 min-w-[280px]">
                                    <div className="flex items-center gap-4">
                                      <div className="flex-shrink-0 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200">
                                        <CharacterRenderer 
                                          character={{
                                            id: userRanking.id,
                                            name: userRanking.name,
                                            level: userRanking.level,
                                            job: userRanking.job,
                                            skincolor: userRanking.skincolor || 0,
                                            gender: userRanking.gender || 0,
                                            hair: userRanking.hair || 30000,
                                            face: userRanking.face || 20000,
                                            equipment: userRanking.equipment || {},
                                            stats: userRanking.stats || { str: 4, dex: 4, int: 4, luk: 4 },
                                            exp: userRanking.exp || 0,
                                            meso: userRanking.meso || 0
                                          }}
                                          scale={1.2}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <h3 className="font-bold text-orange-600 text-lg mb-2">{userRanking.name} (You)</h3>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="w-16 text-gray-500">Level:</span>
                                            <span className="font-semibold text-orange-600">{userRanking.level}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="w-16 text-gray-500">Job:</span>
                                            <span className="font-medium text-gray-700">{userRanking.job}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="w-16 text-gray-500">Guild:</span>
                                            {userRanking.guild ? (
                                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                {userRanking.guild}
                                              </span>
                                            ) : (
                                              <span className="text-gray-400 text-xs">No Guild</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-xl font-bold text-orange-600">#{userRanking.rank}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                      {userRanking.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-lg text-orange-600">{userRanking.name}</p>
                                      <p className="text-xs text-orange-600 font-medium">(You)</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-2xl font-bold text-orange-600">{userRanking.level}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    {userRanking.job}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {userRanking.guild ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                      {userRanking.guild}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm font-medium">No Guild</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-pink-500" />
                                    <span className="text-gray-900 font-medium">{userRanking.fame.toLocaleString()}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-gray-600 font-mono text-sm">
                                    {userRanking.exp.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-8 h-8 bg-orange-200 rounded-full group-hover:bg-orange-300 transition-colors">
                                      <User className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <p className="text-xs text-orange-600 mt-1">Hover to view</p>
                                  </div>
                                </td>
                              </tr>
                            </>
                          )}
                        </>
                      )}
                 </div>
                )}

              {/* Download Tab */}
              {activeTab === 'download' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Download MapleKaede</h1>
                    <p className="text-gray-600">Get started in just a few minutes!</p>
                    <p className="text-sm text-gray-500 mt-2">Latest version with enhanced security and performance</p>
                  </div>

                  {/* Enhanced Download Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-center shadow-2xl">
                    {/* Background Effects */}
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                    
                    <div className="relative z-10">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Download className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-4xl font-bold text-white mb-3">MapleKaede Client v83</h2>
                      <div className="flex items-center justify-center gap-6 mb-6 text-white/90">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          <span>1.2GB Download</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          <span>Windows Compatible</span>
                        </div>
                      </div>
                      
                      <button className="group px-8 py-4 bg-white text-orange-600 rounded-2xl font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg flex items-center gap-3 mx-auto">
                        <Download className="w-6 h-6 group-hover:animate-bounce" />
                        Download Now
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                      
                      <p className="text-white/80 text-sm mt-4">Free to play • No subscription required</p>
                    </div>
                  </div>

                  {/* Installation Steps - Redesigned */}
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <Gamepad2 className="w-6 h-6 text-white" />
                        </div>
                        Installation Guide
                      </h2>
                      <p className="text-gray-600">Follow these simple steps to start playing</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {downloadSteps.map((step, index) => (
                        <div key={step.step} className="group relative bg-white rounded-3xl p-6 shadow-lg border border-gray-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                          {/* Background Effect */}
                          <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-400/10 rounded-full blur-xl" />
                          
                          <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform duration-300">
                                <span className="text-white font-bold text-lg">{step.step}</span>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.description}</p>
                              </div>
                              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                <step.icon className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                              </div>
                            </div>
                            
                            {/* Progress indicator */}
                            <div className="flex items-center gap-2 mt-4">
                              {downloadSteps.map((_, i) => (
                                <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
                                  i <= index ? 'bg-orange-500 w-8' : 'bg-gray-200 w-4'
                                }`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Requirements - Enhanced */}
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        System Requirements
                      </h2>
                      <p className="text-gray-600">Make sure your system meets these requirements</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Minimum Requirements */}
                      <div className="group relative bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 rounded-3xl p-6 border border-blue-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-400/20 rounded-full blur-xl" />
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300/30 rounded-full blur-lg" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900">Minimum</h3>
                              <p className="text-blue-700 font-semibold text-sm">Basic Requirements</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {[
                              { icon: '🖥️', label: 'Windows 7 or higher' },
                              { icon: '💾', label: '2GB RAM' },
                              { icon: '⚡', label: 'Intel Core 2 Duo' },
                              { icon: '💿', label: '2GB free disk space' },
                              { icon: '🎮', label: 'DirectX 9.0c' }
                            ].map((req, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-blue-200/50">
                                <span className="text-xl">{req.icon}</span>
                                <span className="text-gray-700 font-medium">{req.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Recommended Requirements */}
                      <div className="group relative bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/30 rounded-full blur-lg" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                              <Star className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900">Recommended</h3>
                              <p className="text-orange-700 font-semibold text-sm">Optimal Experience</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {[
                              { icon: '🖥️', label: 'Windows 10/11' },
                              { icon: '💾', label: '4GB RAM or more' },
                              { icon: '⚡', label: 'Intel i3 or better' },
                              { icon: '💿', label: '4GB free disk space' },
                              { icon: '🎮', label: 'DirectX 11' }
                            ].map((req, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-orange-200/50">
                                <span className="text-xl">{req.icon}</span>
                                <span className="text-gray-700 font-medium">{req.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-8 border border-gray-200">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Adventure?</h3>
                      <p className="text-gray-600 mb-6">Join thousands of players in the world of MapleKaede</p>
                      
                      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-500" />
                          <span>Active Community</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-orange-500" />
                          <span>Secure Download</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span>24/7 Support</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-orange-500" />
                          <span>Regular Updates</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </main>

        {/* Vote Modal */}
        {showVoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-black/50 backdrop-blur-sm"
              onClick={() => setShowVoteModal(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-3xl overflow-hidden transform transition-all">
              {/* Close button */}
              <button
                onClick={() => setShowVoteModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-6">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Vote for NX</h2>
                      <p className="text-gray-600">Support MapleKaede and earn NX rewards!</p>
                    </div>
                  </div>

                  {/* Current NX and Vote Count */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-semibold text-orange-800">Current NX</p>
                          <p className="text-orange-700 text-lg font-bold">{voteData.currentNX.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-800">Total Votes</p>
                          <p className="text-blue-700 text-lg font-bold">{voteData.totalVotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Today's rewards summary */}
                  {voteData.todayRewards > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">Today's Rewards!</p>
                          <p className="text-green-700 text-sm">
                            You've earned {voteData.todayRewards.toLocaleString()} NX from voting today
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vote sites */}
                <div className="space-y-4 mb-8">
                  {voteData.sites.map((site) => {
                    const siteKey = site.name.toLowerCase().replace(/\s+/g, '');
                    const status = voteData.voteStatus[siteKey] || { voted: false, pending: false };
                    const isDisabled = !canVote(site.name) || status.pending;
                    const cooldownRemaining = getRemainingCooldown(site.name);
                    
                    return (
                      <div
                        key={site.id}
                        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                          status.voted 
                            ? 'border-green-200 bg-green-50' 
                            : status.pending
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg'
                        }`}
                      >
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-400 opacity-5" />
                        
                        <div className="relative p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-3xl">{site.icon}</div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{site.name}</h3>
                                <p className="text-gray-600">
                                  Reward: <span className="font-semibold text-orange-600">{site.nx_reward.toLocaleString()} NX</span>
                                </p>
                                {cooldownRemaining > 0 && (
                                  <p className="text-sm text-orange-600">
                                    Next vote in: {formatTimeRemaining(cooldownRemaining)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {status.voted && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                  <CheckCircle className="w-4 h-4" />
                                  Completed
                                </div>
                              )}
                              
                              {status.pending && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                  <Clock className="w-4 h-4 animate-spin" />
                                  Voting...
                                </div>
                              )}
                              
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleVote(site)}
                                  disabled={isDisabled}
                                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                    isDisabled
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:scale-105 shadow-lg'
                                  }`}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  {status.voted ? 'Voted' : status.pending ? 'Voting...' : 'Vote Now'}
                                </button>
                                
                                {/* Manual verify removed */}

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <p>• Vote every 12 hours for maximum rewards</p>
                  <p>• Voting helps boost our server ranking</p>
                  <p>• NX is added automatically after voting</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowVoteModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

<style jsx>{`
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
  }
  .animate-blob { animation: blob 7s infinite; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animation-delay-1000 { animation-delay: 1s; }
  .animation-delay-2000 { animation-delay: 2s; }
  .animation-delay-4000 { animation-delay: 4s; }
`}</style>
    </div>
  );
};

export default UserDashboard;