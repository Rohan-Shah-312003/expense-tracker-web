"use client"

import React, { useState, useEffect } from 'react';

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [budget, setBudget] = useState('1000');
  const [monthStartDate, setMonthStartDate] = useState(1);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [transferMode, setTransferMode] = useState('export'); // 'export' or 'import'
  const [transferCode, setTransferCode] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [importCode, setImportCode] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on startup
  useEffect(() => {
    loadData();
  }, []);

  // Save data when expenses, budget, or month start date change
  useEffect(() => {
    if (isLoaded) {
      saveData();
    }
  }, [expenses, budget, monthStartDate, isLoaded]);

  const loadData = () => {
    try {
      const savedExpenses = localStorage.getItem('expenses');
      const savedBudget = localStorage.getItem('budget');
      const savedMonthStartDate = localStorage.getItem('monthStartDate');
      
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      if (savedBudget) setBudget(savedBudget);
      if (savedMonthStartDate) setMonthStartDate(parseInt(savedMonthStartDate));
      
      setIsLoaded(true);
    } catch (error) {
      console.log('Error loading data:', error);
      setIsLoaded(true);
    }
  };

  // Generate transfer code and QR data
  const generateTransferCode = () => {
    const data = {
      expenses,
      budget,
      monthStartDate,
      exportDate: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(data);
    const base64Data = btoa(jsonString);
    const code = base64Data.substring(0, 8).toUpperCase(); // Short code for manual entry
    
    setTransferCode(code);
    setQrCodeData(base64Data);
    return { code, fullData: base64Data };
  };

  // Import data from transfer code
  const importDataFromCode = (code) => {
    try {
      let dataToImport;
      
      // If it's a short code, we can't decode it directly (it's just a preview)
      // User needs to scan QR or enter full code
      if (code.length === 8) {
        alert('Please scan the QR code or ask the sender for the full transfer code.');
        return;
      }
      
      // Try to decode the full base64 string
      const jsonString = atob(code);
      dataToImport = JSON.parse(jsonString);
      
      if (dataToImport.expenses && Array.isArray(dataToImport.expenses)) {
        // Ask for confirmation
        const confirmImport = confirm(
          `This will replace your current data with ${dataToImport.expenses.length} expenses. Continue?`
        );
        
        if (confirmImport) {
          setExpenses(dataToImport.expenses);
          setBudget(dataToImport.budget || '1000');
          setMonthStartDate(dataToImport.monthStartDate || 1);
          alert('Data imported successfully!');
          setTransferModalVisible(false);
          setImportCode('');
        }
      } else {
        alert('Invalid transfer code format.');
      }
    } catch (error) {
      alert('Invalid transfer code. Please check and try again.');
    }
  };

  // Generate QR Code using a simple method
  const generateQRCode = (data) => {
    // Using Google Charts API to generate QR code
    const size = 200;
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(data)}`;
    return qrUrl;
  };

  const saveData = () => {
    try {
      localStorage.setItem('expenses', JSON.stringify(expenses));
      localStorage.setItem('budget', budget);
      localStorage.setItem('monthStartDate', monthStartDate.toString());
    } catch (error) {
      console.log('Error saving data:', error);
    }
  };

  const handleAddExpense = () => {
    if (description.trim() === '' || amount.trim() === '') return;
    
    const newExpense = {
      id: Date.now().toString(),
      description: description.trim(),
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
    };
    
    setExpenses([...expenses, newExpense]);
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  const downloadExpensesCSV = () => {
    if (expenses.length === 0) {
      alert('No expenses to download');
      return;
    }

    // Create CSV content
    const csvHeaders = ['Date', 'Description', 'Amount'];
    const csvRows = expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(expense => [
        new Date(expense.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes in description
        expense.amount.toFixed(2)
      ]);

    // Add summary rows
    csvRows.push([]); // Empty row
    csvRows.push(['Summary', '', '']);
    csvRows.push(['Total Expenses', '', expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)]);
    csvRows.push(['Current Period Total', '', totalSpent.toFixed(2)]);
    csvRows.push(['Budget', '', budgetValue.toFixed(2)]);
    csvRows.push(['Remaining Budget', '', remainingBudget.toFixed(2)]);
    csvRows.push(['Period', getPeriodString(), '']);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate current month's expenses based on custom month start date
  const calculateCurrentMonthExpenses = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Determine the current period's start and end
    let startDate, endDate;
    
    if (now.getDate() >= monthStartDate) {
      // We're in the current period that started this month
      startDate = new Date(currentYear, currentMonth, monthStartDate);
      endDate = new Date(currentYear, currentMonth + 1, monthStartDate - 1);
    } else {
      // We're in the current period that started last month
      startDate = new Date(currentYear, currentMonth - 1, monthStartDate);
      endDate = new Date(currentYear, currentMonth, monthStartDate - 1);
    }
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  };

  const currentMonthExpenses = calculateCurrentMonthExpenses();
  const totalSpent = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetValue = parseFloat(budget);
  const remainingBudget = budgetValue - totalSpent;
  const progressPercentage = Math.min((totalSpent / budgetValue) * 100, 100);
  
  // Determine the period string to display (e.g., "May 15 - Jun 14")
  const getPeriodString = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let startDate, endDate;
    
    if (now.getDate() >= monthStartDate) {
      // We're in the current period that started this month
      startDate = new Date(currentYear, currentMonth, monthStartDate);
      endDate = new Date(currentYear, currentMonth + 1, monthStartDate - 1);
    } else {
      // We're in the current period that started last month
      startDate = new Date(currentYear, currentMonth - 1, monthStartDate);
      endDate = new Date(currentYear, currentMonth, monthStartDate - 1);
    }
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-4">
      {/* Header with settings button */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex justify-between items-center px-5 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
          <div className="flex space-x-2">
            <button 
              onClick={() => setTransferModalVisible(true)}
              className="p-2 text-xl hover:bg-gray-100 rounded-full transition-colors"
              title="Transfer Data"
            >
              📱
            </button>
            <button 
              onClick={() => setSettingsModalVisible(true)}
              className="p-2 text-2xl hover:bg-gray-100 rounded-full transition-colors"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Budget overview */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-3">
            Period: {getPeriodString()}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Spent:</span>
              <span className="font-medium">${totalSpent.toFixed(2)} / ${budgetValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Remaining:</span>
              <span className={`font-medium ${remainingBudget < 0 ? 'text-red-500' : 'text-green-600'}`}>
                ${remainingBudget.toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                progressPercentage > 90 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Add expense form */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Add Expense</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-gray-400 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              className="w-full p-3 text-gray-400 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 text-gray-400 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button 
              onClick={handleAddExpense}
              className="w-full bg-green-500 text-white p-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Add Expense
            </button>
          </div>
        </div>
        
        {/* Expense list */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Recent Expenses</h2>
            <button
              onClick={downloadExpensesCSV}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Download CSV</span>
            </button>
          </div>
          {currentMonthExpenses.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[...currentMonthExpenses]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {expense.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <span className="font-semibold text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </span>
                      <button 
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No expenses added yet for this period.
            </div>
          )}
        </div>
      </div>
      
      {/* Settings Modal */}
      {isSettingsModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-center">Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Budget
                </label>
                <input
                  type="number"
                  placeholder="Budget Amount"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  step="0.01"
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month Start Date
                </label>
                <input
                  type="number"
                  placeholder="Day of month (1-28)"
                  value={monthStartDate.toString()}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 28) {
                      setMonthStartDate(parsed);
                    } else if (e.target.value === '') {
                      setMonthStartDate('');
                    }
                  }}
                  min="1"
                  max="28"
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button 
              onClick={() => setSettingsModalVisible(false)}
              className="w-full bg-blue-500 text-white p-3 rounded-lg font-medium hover:bg-blue-600 transition-colors mt-6"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
      
      {/* Transfer Modal */}
      {isTransferModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-center">Transfer Data</h2>
            
            {/* Mode Selection */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
              <button
                onClick={() => setTransferMode('export')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  transferMode === 'export' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Export Data
              </button>
              <button
                onClick={() => setTransferMode('import')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  transferMode === 'import' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Import Data
              </button>
            </div>

            {transferMode === 'export' ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 text-center">
                  Share your expense data with another device
                </div>
                
                {!qrCodeData ? (
                  <button
                    onClick={() => {
                      const { code, fullData } = generateTransferCode();
                      setQrCodeData(fullData);
                    }}
                    className="w-full bg-blue-500 text-white p-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    Generate Transfer Code
                  </button>
                ) : (
                  <div className="space-y-4">
                    {/* QR Code */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700 mb-2">Scan QR Code</div>
                      <div className="flex justify-center">
                        <img 
                          src={generateQRCode(qrCodeData)} 
                          alt="QR Code for data transfer"
                          className="border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Transfer Code */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Or use this code:</div>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <div className="text-lg font-mono text-center font-bold text-blue-600">
                          {transferCode}
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                          Reference code (use QR for full transfer)
                        </div>
                      </div>
                    </div>

                    {/* Full Code for Manual Entry */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Full Transfer Code:</div>
                      <textarea
                        value={qrCodeData}
                        readOnly
                        className="w-full p-2 bg-gray-100 rounded-lg border border-gray-200 text-xs font-mono h-20 resize-none"
                        onClick={(e) => e.target.select()}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Tap to select all, then copy for manual transfer
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 text-center">
                  Import expense data from another device
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter Transfer Code
                  </label>
                  <textarea
                    placeholder="Paste the full transfer code here or scan QR code"
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none text-sm"
                  />
                </div>
                
                <button
                  onClick={() => importDataFromCode(importCode.trim())}
                  disabled={!importCode.trim()}
                  className="w-full bg-green-500 text-white p-3 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Import Data
                </button>
                
                <div className="text-xs text-gray-500 text-center">
                  ⚠️ This will replace all your current expense data
                </div>
              </div>
            )}
            
            <button 
              onClick={() => {
                setTransferModalVisible(false);
                setTransferMode('export');
                setTransferCode('');
                setQrCodeData('');
                setImportCode('');
              }}
              className="w-full bg-gray-500 text-white p-3 rounded-lg font-medium hover:bg-gray-600 transition-colors mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}