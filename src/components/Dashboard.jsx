import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('PRESENT');
  const [onVacation, setOnVacation] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [currentWeekEnd, setCurrentWeekEnd] = useState(null);
  const [isModifying, setIsModifying] = useState(false); // Track if we're modifying a record
  const [modifyRecordId, setModifyRecordId] = useState(null); // Track which record is being modified
  const [modifyStatus, setModifyStatus] = useState(''); // Track status for modification

  useEffect(() => {
    // Load attendance data from localStorage first
    const storedAttendance = localStorage.getItem('attendanceData');
    if (storedAttendance) {
      setAttendanceData(JSON.parse(storedAttendance));
    }

    // Fetch employees from JSON file
    fetch('/data/data.json')
      .then(response => response.json())
      .then(data => {
        setEmployees(data.employees);
        // If no attendance data exists in localStorage, use the one from JSON
        if (!storedAttendance) {
          setAttendanceData(data.attendance || []);
        }
      })
      .catch(error => console.error('Error loading data:', error));

    // Set current week's date range
    setWeekRange(new Date());
  }, []);

  const setWeekRange = (date) => {
    const currentDate = date || new Date();
    const currentDay = currentDate.getDay();
    const diff = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    setCurrentWeekStart(startOfWeek);
    setCurrentWeekEnd(endOfWeek);
  };

  const handlePreviousWeek = () => {
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    setWeekRange(previousWeekStart);
  };

  const handleNextWeek = () => {
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    setWeekRange(nextWeekStart);
  };

  const getFilteredAttendance = () => {
    return attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= currentWeekStart && recordDate <= currentWeekEnd;
    });
  };

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);
    const employee = employees.find(emp => emp.id === parseInt(employeeId));
    setOnVacation(employee ? employee.onVacation : null);
  };

  const handleCreateAttendance = () => {
    if (!selectedEmployee || !date) {
      alert('Please select an employee and a date.');
      return;
    }

    const employee = employees.find(emp => emp.id === parseInt(selectedEmployee));

    if (!employee) {
      alert("Invalid employee selection.");
      return;
    }

    const isOnVacation = employee.vacationStart && employee.vacationEnd
      && new Date(date) >= new Date(employee.vacationStart)
      && new Date(date) <= new Date(employee.vacationEnd);

    if (isOnVacation) {
      alert('Cannot record attendance. Employee is on vacation during this period!');
      return;
    }

    const newAttendance = [...attendanceData];
    const existingRecord = newAttendance.find(
      (record) => record.employeeId === employee.id && record.date === date
    );

    if (existingRecord) {
      existingRecord.status = status;
    } else {
      newAttendance.push({
        id: Date.now(),
        employeeId: employee.id,
        employeeName: employee.name,
        date,
        status,
        vacationStart: employee.vacationStart,
        vacationEnd: employee.vacationEnd,
        recordedBy: currentUser.id,
      });
    }

    setAttendanceData(newAttendance);
    localStorage.setItem('attendanceData', JSON.stringify(newAttendance));

    alert(`Attendance record saved successfully! Employee on vacation: ${employee.vacationStart && employee.vacationEnd ? 'Yes' : 'No'}`);
    setSelectedEmployee('');
    setDate('');
    setStatus('PRESENT');
    setOnVacation(null);
  };

  const handleModifyAttendance = (attendanceId) => {
    setIsModifying(true); 
    setModifyRecordId(attendanceId); 
    const recordToModify = attendanceData.find(record => record.id === attendanceId);
    setModifyStatus(recordToModify ? recordToModify.status : 'PRESENT'); // Set current status
  };

  // Handle status change during modification
  const handleStatusChange = (e) => {
    setModifyStatus(e.target.value);
  };

  // Save modified attendance
  const handleSaveModifiedAttendance = () => {
    if (modifyRecordId === null) return;
    
    const updatedAttendance = [...attendanceData];
    const recordToModify = updatedAttendance.find(record => record.id === modifyRecordId);
    
    if (recordToModify) {
      recordToModify.status = modifyStatus;
      setAttendanceData(updatedAttendance);
      localStorage.setItem('attendanceData', JSON.stringify(updatedAttendance));

      alert('Attendance record updated successfully!');
      setIsModifying(false);
      setModifyRecordId(null);
    }
  };

  // Handle Delete Attendance
  const handleDeleteAttendance = (attendanceId) => {
    const updatedAttendance = attendanceData.filter((record) => record.id !== attendanceId);
    
    const attendanceRecord = attendanceData.find((record) => record.id === attendanceId);
    if (attendanceRecord) {
      if (attendanceRecord.recordedBy === currentUser.id) {
        setAttendanceData(updatedAttendance);
        localStorage.setItem('attendanceData', JSON.stringify(updatedAttendance));
        alert('Attendance record deleted successfully!');
      } else {
        alert('You do not have permission to delete this record.');
      }
    }
  };

  return (
    <div>
      <h1>Absence Management System</h1>
      <div>
        <span>Welcome, {currentUser.username}</span>
        <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>

      

      {/* Form to Create Attendance */}
      <h2>Create Attendance Record</h2>
      <label>Employee:</label>
      <select value={selectedEmployee} onChange={handleEmployeeChange}>
        <option value="">Select Employee</option>
        {employees.map(emp => (
          <option key={emp.id} value={emp.id}>
            {emp.name} - {emp.department}
          </option>
        ))}
      </select>

      <label>Date:</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      {/* Show On Vacation Status */}
      {selectedEmployee && (
        <p style={{ color: onVacation ? 'red' : 'green' }}>
          Employee is {onVacation ? 'on vacation ❌' : 'available ✅'}
        </p>
      )}

      <label>Status:</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="PRESENT">Present</option>
        <option value="ABSENT">Absent</option>
        <option value="LATE">Late</option>
      </select>

      <button onClick={handleCreateAttendance}>Save Attendance</button>

      {/* Display Attendance Table */}
      <h2>Attendance Records</h2>

      {/* Week Navigation Buttons */}
      <div>
        <button onClick={handlePreviousWeek}>Previous Week</button>
        <button onClick={handleNextWeek}>Next Week</button>
        <p>
          Week: {currentWeekStart ? currentWeekStart.toLocaleDateString() : ''} - {currentWeekEnd ? currentWeekEnd.toLocaleDateString() : ''}
        </p>
      </div>
      <table border="1">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Status</th>
            <th>On Vacation</th>
            {currentUser.id === 1 && <th>Actions</th>} {/* Display only for RH1 */}
          </tr>
        </thead>
        <tbody>
          {getFilteredAttendance().length > 0 ? (
            getFilteredAttendance().map((record, index) => (
              <tr key={index}>
                <td>{record.employeeName}</td>
                <td>{record.date}</td>
                <td>
                  {isModifying && modifyRecordId === record.id ? (
                    <select value={modifyStatus} onChange={handleStatusChange}>
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="LATE">Late</option>
                    </select>
                  ) : (
                    record.status
                  )}
                </td>
                <td>{record.vacationStart && record.vacationEnd ? 'Yes' : 'No'}</td>
                {currentUser.id === record.recordedBy && (
                  <td>
                    {isModifying && modifyRecordId === record.id ? (
                      <button onClick={handleSaveModifiedAttendance}>Save</button>
                    ) : (
                      <button onClick={() => handleModifyAttendance(record.id)}>Modify</button>
                    )}
                    <button onClick={() => handleDeleteAttendance(record.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No attendance records available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;
