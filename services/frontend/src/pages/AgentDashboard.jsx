import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';

function AgentDashboard() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AgentOverview />} />
      </Routes>
    </Layout>
  );
}

function AgentOverview() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome, Agent</h2>
        <p className="text-slate-600">Manage your client relationships and daily tasks</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">My Clients</p>
              <p className="text-2xl font-bold">87</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Pending Tasks</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">This Month's Sales</p>
              <p className="text-2xl font-bold">$234K</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-emerald-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 group">
            <div className="text-center">
              <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👤</span>
              <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">Add Client</p>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group">
            <div className="text-center">
              <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📞</span>
              <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Schedule Call</p>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 group">
            <div className="text-center">
              <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📊</span>
              <p className="text-sm font-medium text-slate-700 group-hover:text-orange-700">View Reports</p>
            </div>
          </button>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Today's Schedule</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gradient-to-r from-emerald-50 to-transparent rounded-lg border-l-4 border-emerald-500">
            <span className="mr-3">📞</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Client Call - John Smith</p>
              <p className="text-xs text-slate-600">Loan application review</p>
            </div>
            <span className="text-xs text-slate-500">10:00 AM</span>
          </div>
          
          <div className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border-l-4 border-blue-500">
            <span className="mr-3">🤝</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">New Client Meeting</p>
              <p className="text-xs text-slate-600">Investment portfolio discussion</p>
            </div>
            <span className="text-xs text-slate-500">2:00 PM</span>
          </div>
          
          <div className="flex items-center p-3 bg-gradient-to-r from-orange-50 to-transparent rounded-lg border-l-4 border-orange-500">
            <span className="mr-3">📄</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Document Review</p>
              <p className="text-xs text-slate-600">Mortgage application processing</p>
            </div>
            <span className="text-xs text-slate-500">4:00 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentDashboard;
