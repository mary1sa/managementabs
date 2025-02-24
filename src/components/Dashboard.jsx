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
  const [isModifying, setIsModifying] = useState(false);
  const [modifyRecordId, setModifyRecordId] = useState(null);
  const [modifyStatus, setModifyStatus] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statistics, setStatistics] = useState({ present: 0, absent: 0, late: 0 });
  const [modificationHistory, setModificationHistory] = useState([]);

  useEffect(() => {
    // Load attendance data and modification history from localStorage
    const storedAttendance = localStorage.getItem('attendanceData');
    const storedHistory = localStorage.getItem('modificationHistory');

    if (storedAttendance) {
      setAttendanceData(JSON.parse(storedAttendance));
    }
    if (storedHistory) {
      setModificationHistory(JSON.parse(storedHistory));
    }

    // Fetch employees from JSON file
    fetch('/data/data.json')
      .then(response => response.json())
      .then(data => {
        setEmployees(data.employees);
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

    // Add to modification history
    const historyEntry = {
      id: Date.now(),
      action: `Responsable ${currentUser.username} a marqué ${employee.name} comme ${status} le ${date}`,
      timestamp: new Date().toLocaleString(),
    };
    const newHistory = [...modificationHistory, historyEntry];
    setModificationHistory(newHistory);
    localStorage.setItem('modificationHistory', JSON.stringify(newHistory));

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
    setModifyStatus(recordToModify ? recordToModify.status : 'PRESENT');
  };

  const handleStatusChange = (e) => {
    setModifyStatus(e.target.value);
  };

  const handleSaveModifiedAttendance = () => {
    if (modifyRecordId === null) return;

    const updatedAttendance = [...attendanceData];
    const recordToModify = updatedAttendance.find(record => record.id === modifyRecordId);

    if (recordToModify) {
      // Add to modification history
      const historyEntry = {
        id: Date.now(),
        action: `Responsable ${currentUser.username} a modifié le statut de ${recordToModify.employeeName} en ${modifyStatus} le ${recordToModify.date}`,
        timestamp: new Date().toLocaleString(),
      };
      const newHistory = [...modificationHistory, historyEntry];
      setModificationHistory(newHistory);
      localStorage.setItem('modificationHistory', JSON.stringify(newHistory));

      recordToModify.status = modifyStatus;
      setAttendanceData(updatedAttendance);
      localStorage.setItem('attendanceData', JSON.stringify(updatedAttendance));

      alert('Attendance record updated successfully!');
      setIsModifying(false);
      setModifyRecordId(null);
    }
  };

  const handleDeleteAttendance = (attendanceId) => {
    const updatedAttendance = attendanceData.filter((record) => record.id !== attendanceId);

    const attendanceRecord = attendanceData.find((record) => record.id === attendanceId);
    if (attendanceRecord) {
      if (attendanceRecord.recordedBy === currentUser.id) {
        setAttendanceData(updatedAttendance);
        localStorage.setItem('attendanceData', JSON.stringify(updatedAttendance));

        // Add to modification history
        const historyEntry = {
          id: Date.now(),
          action: `Responsable ${currentUser.username} a supprimé l'enregistrement de ${attendanceRecord.employeeName} pour le ${attendanceRecord.date}`,
          timestamp: new Date().toLocaleString(),
        };
        const newHistory = [...modificationHistory, historyEntry];
        setModificationHistory(newHistory);
        localStorage.setItem('modificationHistory', JSON.stringify(newHistory));

        alert('Attendance record deleted successfully!');
      } else {
        alert('You do not have permission to delete this record.');
      }
    }
  };

  const calculateStatistics = () => {
    const filteredData = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      const startDate = customStartDate ? new Date(customStartDate) : currentWeekStart;
      const endDate = customEndDate ? new Date(customEndDate) : currentWeekEnd;
      return recordDate >= startDate && recordDate <= endDate;
    });

    const stats = {
      present: filteredData.filter(record => record.status === 'PRESENT').length,
      absent: filteredData.filter(record => record.status === 'ABSENT').length,
      late: filteredData.filter(record => record.status === 'LATE').length,
    };
    setStatistics(stats);
  };

  useEffect(() => {
    calculateStatistics();
  }, [customStartDate, customEndDate, attendanceData]);

  return (
    <div>
      <h1>Absence Management System</h1>
      <div>
        <span>Welcome, {currentUser.username}</span>
        <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>

      {/* Résumé statistique */}
      <h2>Résumé Statistique</h2>
      <div>
        <label>Date de début:</label>
        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
        <label>Date de fin:</label>
        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
      </div>
      <div>
        <p>Présents: {statistics.present}</p>
        <p>Absents: {statistics.absent}</p>
        <p>Retards: {statistics.late}</p>
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
            {currentUser.id === 1 && <th>Actions</th>}
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

      {/* Historique des modifications */}
      <h2>Historique des Modifications</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Action</th>
            <th>Date et Heure</th>
          </tr>
        </thead>
        <tbody>
          {modificationHistory.map((entry, index) => (
            <tr key={index}>
              <td>{entry.action}</td>
              <td>{entry.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;