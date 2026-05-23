import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

interface QuizQuestion {
  type: 'MCQ' | 'TF' | 'Short';
  text: string;
  options: string[];
  correctAnswer: string;
}

@Component({
  selector: 'app-examgen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './examgen.html',
  styleUrls: ['./examgen.css'],
})
export class Examgen implements OnInit {
  private router = inject(Router);
  currentView: 'setup' | 'editor' | 'preview' = 'setup';

  examTitle = '';
  examDescription = '';
  syllabusInput = '';
  questionCount = 5;
  submitTimeout = 30;  // minutes
  examPassword = '';
  validityStart = '';
  validityEnd = '';

  questions: QuizQuestion[] = [];
  isGenerating = false;
  message = '';
  isPublishing = false;
  editingQuizId: string | null = null;
  private socket?: Socket;

  resetForm() {
    this.currentView = 'setup';
    this.examTitle = '';
    this.examDescription = '';
    this.syllabusInput = '';
    this.questionCount = 5;
    this.submitTimeout = 3;
    this.examPassword = '';
    this.validityStart = '';
    this.validityEnd = '';
    this.questions = [];
    this.editingQuizId = null;
    this.message = '';
    this.isGenerating = false;
    this.isPublishing = false;
  }

  ngOnInit() {
    this.socket = io();
  }

  async generateQuiz() {
    if (!this.examTitle || !this.validityStart || !this.validityEnd || !this.syllabusInput) {
      this.message = 'Please fill in the required fields before generating the quiz.';
      return;
    }

    this.message = '';
    this.isGenerating = true;

    try {
const response = await fetch('/generate', {
  method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabus: this.syllabusInput, count: this.questionCount })
      });

      const data = await response.json();
      const normalized = this.normalizeQuestions(data.questions || []);
      this.questions = normalized;
      this.currentView = 'editor';
    } catch (error) {
      console.error('Generate Quiz error:', error);
      this.message = 'Unable to generate questions right now. Please try again.';
    } finally {
      this.isGenerating = false;
    }
  }

  normalizeQuestions(rawQuestions: any[]): QuizQuestion[] {
    return rawQuestions.slice(0, this.questionCount).map((q: any) => {
      const type = q?.type === 'TF' ? 'TF' : q?.type === 'Short' ? 'Short' : 'MCQ';
      const options = Array.isArray(q?.options) ? q.options : type === 'TF' ? ['True', 'False'] : ['', '', '', ''];
      return {
        type,
        text: q?.text || '',
        options,
        correctAnswer: q?.correctAnswer || ''
      };
    });
  }

  addQuestion() {
    this.questions.push({ type: 'MCQ', text: '', options: ['', '', '', ''], correctAnswer: '' });
  }

  removeQuestion(index: number) {
    this.questions.splice(index, 1);
  }

  updateQuestionType(index: number, value: string) {
    const question = this.questions[index];
    question.type = value as QuizQuestion['type'];
    if (question.type === 'MCQ') {
      question.options = question.options.length === 4 ? question.options : ['', '', '', ''];
    } else if (question.type === 'TF') {
      question.options = ['True', 'False'];
    } else {
      question.options = [];
    }
  }

  updateQuestionText(index: number, text: string) {
    this.questions[index].text = text;
  }

  updateQuestionOption(index: number, optionIndex: number, value: string) {
    this.questions[index].options[optionIndex] = value;
  }

  updateCorrectAnswer(index: number, value: string) {
    this.questions[index].correctAnswer = value;
  }

  goToPreview() {
    this.currentView = 'preview';
  }

  backToSetup() {
    this.currentView = 'setup';
  }

  backToEditor() {
    this.currentView = 'editor';
  }

async publishQuiz() {
    if (this.questions.length === 0) {
      this.message = 'Add at least one question before publishing.';
      return;
    }

    this.isPublishing = true;
    this.message = '';

    try {
      // Send all the captured form data to the backend
      const response = await fetch('/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: this.examTitle,
          description: this.examDescription,
          validityStart: this.validityStart,
          expiryDateTime: this.validityEnd, // Mapped from validityEnd
          submitTimeout: this.submitTimeout,
          password: this.examPassword,
          questions: this.questions,
          maxCandidates: 50,
          dbVerify: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.resetForm();
        this.message = `Quiz published! Session ID: ${result.sessionId}`;
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      } else {
        this.message = `Publish failed: ${result.error || 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Publish Quiz error:', error);
      this.message = 'Unable to publish quiz. Please try again.';
    } finally {
      this.isPublishing = false;
    }
  }
}