import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate.html',
  styleUrls: ['./candidate.css']
})
export class CandidateComponent implements OnInit, OnDestroy {
  // Credentials
  public sessionId: string = '';
  public studentName: string = '';
  public password: string = '';

  // State
  public isJoined: boolean = false;
  public isSubmitted: boolean = false;
  public questions: any[] = [];
  public studentAnswers: { [key: number]: any } = {};
  
  // Metrics
  private startTime: number = 0;
  private charCount: number = 0;
  private socket: any;

  ngOnInit() {
    this.socket = io(); // Connect to server

    // Listen for Exam Data
    this.socket.on('session-data', (data: any) => {
      this.startTime = Date.now();
      this.questions = data.questions;
      this.isJoined = true;
    });

    // Handle session errors (e.g., wrong password)
    this.socket.on('error', (msg: string) => {
      alert(msg);
    });
  }

  // --- CORE METHODS ---

  joinSession() {
    if (!this.sessionId || !this.studentName || !this.password) {
      return alert("MISSING_CREDENTIALS");
    }

    // Name Validation: Required Full Name
    if (!/^[a-zA-Z]{2,}(?: [a-zA-Z]+){1,}$/.test(this.studentName)) {
      return alert("SECURITY_ERROR: Full Name Required.");    
    }

    this.socket.emit('join-session', { 
      sessionId: this.sessionId, 
      password: this.password, 
      name: this.studentName 
    });
  }

  handleInput(index: number, value: any) {
    this.studentAnswers[index] = value;
    
    // Logic to calculate character count for WPM metrics
    let totalChars = 0;
    Object.values(this.studentAnswers).forEach(val => {
      if (typeof val === 'string') totalChars += val.length;
    });
    this.charCount = totalChars;
  }

  submitExam() {
    if (!confirm("CONFIRM_FINAL_SUBMISSION?")) return

    const timeTaken = (Date.now() - this.startTime) / 1000;
    const wpm = Math.round((this.charCount / 5) / (timeTaken / 60));

    this.socket.emit('submit-exam', {
      sessionId: this.sessionId,
      answers: this.studentAnswers,
      metrics: { wpm, timeTaken }
    });

    this.isSubmitted = true;
  }

  // --- SECURITY: Tab Switch Detection ---
  @HostListener('document:visibilitychange', [])
  onVisibilityChange() {
    if (document.hidden && this.isJoined && !this.isSubmitted) {
      this.socket.emit('tab-switch', { sessionId: this.sessionId });
    }
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }
}