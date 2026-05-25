import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

interface StudentLog {
    name: string;
    score: number;
    online: boolean;
    answers?: any;
    tab_switches?: number;
    suspicion?: string;
    time_taken?: number;
}

interface ExamSession {
    title: string;
    isExpanded: boolean;
    students: { [studentId: string]: StudentLog };
    questions?: any[];
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    userProfile = this.authService.currentUser;

    public localSessions: { [sessionId: string]: ExamSession } = {};
    public selectedLog: any = null;
    public overrideValue: number = 0;
    public currentTheme = 'light';

    private socket?: Socket;
    private pollInterval: any;

    async ngOnInit() {
        const savedTheme = localStorage.getItem('algo-theme') || 'light';
        this.setTheme(savedTheme);

        if (environment.production) {
            await this.loadSessionsFromSupabase();
            this.pollInterval = setInterval(() => this.loadSessionsFromSupabase(), 10000);
        } else {
            this.socket = io();
            this.socket.on('admin-init', (sessions: any) => {
                this.localSessions = { ...sessions };
                Object.keys(this.localSessions).forEach(id => {
                    this.localSessions[id].isExpanded = false;
                });
                this.cdr.detectChanges();
            });
            this.socket.on('admin-update', ({ sessionId, session }: any) => {
                const wasExpanded = this.localSessions[sessionId]?.isExpanded || false;
                this.localSessions = { ...this.localSessions, [sessionId]: { ...session, isExpanded: wasExpanded } };
                this.cdr.detectChanges();
            });
        }
    }

    async loadSessionsFromSupabase() {
        try {
            const token = await this.authService.getAccessToken();
            if (!token) return;

            const res = await fetch('/get-sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const { sessions } = await res.json();

            const prevExpanded: { [id: string]: boolean } = {};
            Object.keys(this.localSessions).forEach(id => {
                prevExpanded[id] = this.localSessions[id].isExpanded;
            });

            this.localSessions = {};

            for (const s of (sessions || [])) {
                const subRes = await fetch(`/get-submissions?sessionId=${s.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const students: any = {};
                if (subRes.ok) {
                    const subData = await subRes.json();
                    (subData.submissions || []).forEach((sub: any) => {
                        students[sub.candidate_id] = {
                            name: sub.candidate_email || sub.candidate_id.substring(0, 8),
                            score: sub.score,
                            online: false,
                            answers: sub.answers,
                            tab_switches: sub.tab_switches,
                            suspicion: sub.suspicion,
                            time_taken: sub.time_taken
                        };
                    });
                }

                this.localSessions[s.id] = {
                    title: s.title,
                    isExpanded: prevExpanded[s.id] || false,
                    students,
                    questions: s.questions || []
                };
            }
            this.cdr.detectChanges();
        } catch (e) {
            console.error('Failed to load sessions:', e);
        }
    }

    setTheme(theme: string) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('algo-theme', theme);
    }

    toggleStudentList(id: string) {
        if (this.localSessions[id]) {
            this.localSessions[id].isExpanded = !this.localSessions[id].isExpanded;
        }
    }

    async endExam(id: string) {
        if (!confirm(`CRITICAL: TERMINATE SESSION [${id}]? This cannot be undone.`)) return;

        if (environment.production) {
            const token = await this.authService.getAccessToken();
            await fetch('/terminate-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: id, ownerToken: token })
            });
            delete this.localSessions[id];
            this.cdr.detectChanges();
        } else {
            this.socket?.emit('terminate-session', id);
        }
    }

    openLogs(sessId: string, studId: string) {
        const session = this.localSessions[sessId];
        const student = session.students[studId];
        const questions = session.questions || [];

        const questionLogs = questions.map((q: any, i: number) => {
            const given = student.answers?.[i] ?? 'NO ANSWER';
            const correct = q.correctAnswer || '';
            const isCorrect = String(given).trim().toLowerCase() === String(correct).trim().toLowerCase();
            return { text: q.text, given, correct, isCorrect };
        });

        this.selectedLog = {
            sessId,
            studId,
            name: student.name,
            currentScore: student.score || 0,
            tabSwitches: student.tab_switches || 0,
            suspicion: student.suspicion || 'CLEAN',
            timeTaken: student.time_taken || 0,
            questionLogs
        };
        this.overrideValue = student.score || 0;
    }

    async saveOverride() {
        if (!this.selectedLog) return;

        if (environment.production) {
            const token = await this.authService.getAccessToken();
            await fetch('/update-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.selectedLog.sessId,
                    candidateId: this.selectedLog.studId,
                    newScore: this.overrideValue,
                    ownerToken: token
                })
            });
            if (this.localSessions[this.selectedLog.sessId]?.students[this.selectedLog.studId]) {
                this.localSessions[this.selectedLog.sessId].students[this.selectedLog.studId].score = this.overrideValue;
            }
        } else {
            this.socket?.emit('update-score', {
                sessionId: this.selectedLog.sessId,
                studentId: this.selectedLog.studId,
                newScore: this.overrideValue
            });
        }
        this.selectedLog = null;
        this.cdr.detectChanges();
    }

    get sessionIds() { return Object.keys(this.localSessions); }

    getStudentEntries(session: ExamSession): [string, StudentLog][] {
        return Object.entries(session.students || {});
    }

    navigateToQuizMaker() { this.router.navigate(['/examgen']); }
    navigateToCandidate() { this.router.navigate(['/candidate']); }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    ngOnDestroy() {
        clearInterval(this.pollInterval);
        this.socket?.disconnect();
    }
}