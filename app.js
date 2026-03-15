const app = {
    // State
    currentExamType: null,
    currentYear: null,
    questions: [],
    // New: Available subjects
    subjects: [],
    currentSubject: null,

    currentQuestionIndex: 0,
    answers: {}, // { questionIndex: selectedOptionIndex }
    reviewStatus: {}, // { questionIndex: true/false }
    timer: null,
    timeRemaining: 0,
    isExamActive: false,

    // Exam Configs
    examConfig: {
        'JEE Main': { time: 3 * 60 * 60, correct: 4, wrong: -1 },
        'SSC CGL': { time: 1 * 60 * 60, correct: 2, wrong: -0.5 }
    },

    init: async () => {
        // Load data
        if (window.questionBank) {
            app.allQuestions = window.questionBank;
        } else {
            console.error("Failed to load questions from window.questionBank");
            alert("Failed to load question bank.");
        }

        // Theme Toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });

        // Initialize view
        app.checkResume();
    },

    // Persistence
    checkResume: () => {
        const savedState = localStorage.getItem('examState');
        if (savedState) {
            if (confirm("Found an unfinished exam. Do you want to resume?")) {
                const state = JSON.parse(savedState);
                app.restoreState(state);
            } else {
                localStorage.removeItem('examState');
                app.showHome();
            }
        } else {
            app.showHome();
        }
    },

    saveState: () => {
        if (!app.isExamActive) return;
        const state = {
            currentExamType: app.currentExamType,
            currentYear: app.currentYear,
            questions: app.questions, // Save shuffled order
            subjects: app.subjects,
            currentSubject: app.currentSubject,
            currentQuestionIndex: app.currentQuestionIndex,
            answers: app.answers,
            reviewStatus: app.reviewStatus,
            timeRemaining: app.timeRemaining
        };
        localStorage.setItem('examState', JSON.stringify(state));
    },

    restoreState: (state) => {
        app.currentExamType = state.currentExamType;
        app.currentYear = state.currentYear;
        app.questions = state.questions;
        app.subjects = state.subjects || [];
        app.currentSubject = state.currentSubject || (app.subjects[0] || null);
        app.currentQuestionIndex = state.currentQuestionIndex;
        app.answers = state.answers;
        app.reviewStatus = state.reviewStatus;
        app.timeRemaining = state.timeRemaining;
        app.isExamActive = true;

        app.showSection('exam-section');
        app.updateTimerDisplay();
        app.renderSubjectTabs();
        app.renderPalette();
        app.renderQuestion();
        app.startTimer();
    },

    // Utils
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    shuffleOptions: (question) => {
        let indices = question.options.map((_, i) => i);
        indices = app.shuffleArray(indices);
        const newOptions = indices.map(i => question.options[i]);
        const newCorrectAnswer = indices.indexOf(question.correctAnswer);

        return {
            ...question,
            options: newOptions,
            correctAnswer: newCorrectAnswer,
            originalIndex: question.id
        };
    },

    // Navigation
    showSection: (id) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    showHome: () => {
        app.stopTimer();
        app.showSection('home-section');
        if (document.fullscreenElement) document.exitFullscreen().catch(err => console.log(err));
    },

    toggleFullscreen: () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    },

    selectExam: (type) => {
        app.currentExamType = type;
        document.getElementById('selected-exam-title').innerText = `${type} Practice Tests`;

        const papersList = document.getElementById('papers-list');
        papersList.innerHTML = '';

        const years = [...new Set(app.allQuestions.filter(q => q.exam === type).map(q => q.year))];

        if (years.length === 0) {
            papersList.innerHTML = '<p>No papers available for this category.</p>';
            app.showSection('setup-section');
            return;
        }

        years.forEach(year => {
            const btn = document.createElement('div');
            btn.className = 'card';
            btn.innerHTML = `<h3>${year} Paper</h3><p>Start Full Mock Test</p>`;
            btn.onclick = () => app.startExam(type, year);
            papersList.appendChild(btn);
        });

        app.showSection('setup-section');
    },

    startExam: (type, year) => {
        app.currentYear = year;
        let rawQuestions = app.allQuestions.filter(q => q.exam === type && q.year === year);

        if (rawQuestions.length === 0) {
            alert("No questions found for this selection.");
            return;
        }

        // Randomize
        rawQuestions = app.shuffleArray([...rawQuestions]);
        
        // Limit to 15 questions per subject
        const allSubjects = [...new Set(rawQuestions.map(q => q.subject))];
        let limitedQuestions = [];
        allSubjects.forEach(sub => {
            limitedQuestions.push(...rawQuestions.filter(q => q.subject === sub).slice(0, 15));
        });

        app.questions = limitedQuestions.map(q => app.shuffleOptions(q));

        // Extract Subjects
        app.subjects = [...new Set(app.questions.map(q => q.subject))];
        // Sort subjects
        app.subjects.sort();
        app.currentSubject = app.subjects[0];

        // Find first question of first subject
        app.currentQuestionIndex = app.questions.findIndex(q => q.subject === app.currentSubject);

        // Reset State
        app.answers = {};
        app.reviewStatus = {};
        app.timeRemaining = app.examConfig[type].time;
        app.isExamActive = true;

        // UI Setup
        app.updateTimerDisplay();
        app.renderSubjectTabs();
        app.renderPalette();
        app.renderQuestion();

        app.showSection('exam-section');
        app.startTimer();
        app.saveState();
    },

    // Subject Logic
    renderSubjectTabs: () => {
        const container = document.getElementById('subject-tabs');
        container.innerHTML = '';
        app.subjects.forEach(sub => {
            const tab = document.createElement('div');
            tab.className = `subject-tab ${sub === app.currentSubject ? 'active' : ''}`;
            tab.innerText = sub;
            tab.onclick = () => app.switchSubject(sub);
            container.appendChild(tab);
        });
    },

    switchSubject: (subject) => {
        if (subject === app.currentSubject) return;
        app.currentSubject = subject;

        // Find the first question of this subject
        const firstIdx = app.questions.findIndex(q => q.subject === subject);
        if (firstIdx !== -1) {
            app.currentQuestionIndex = firstIdx;
        }

        app.renderSubjectTabs();
        app.renderPalette();
        app.renderQuestion();
        app.saveState();
    },

    // Timer Logic
    startTimer: () => {
        if (app.timer) clearInterval(app.timer);
        app.timer = setInterval(() => {
            if (app.timeRemaining <= 0) {
                app.submitExam();
                return;
            }
            app.timeRemaining--;
            app.updateTimerDisplay();
            if (app.timeRemaining % 5 === 0) app.saveState();
        }, 1000);
    },

    stopTimer: () => {
        if (app.timer) clearInterval(app.timer);
    },

    updateTimerDisplay: () => {
        const hrs = Math.floor(app.timeRemaining / 3600);
        const mins = Math.floor((app.timeRemaining % 3600) / 60);
        const secs = app.timeRemaining % 60;
        document.getElementById('exam-timer').innerText =
            `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Question Rendering
    renderQuestion: () => {
        const q = app.questions[app.currentQuestionIndex];

        // If current question's subject doesn't match currentSubject (e.g. from state restore w/ glitch), fix it
        if (q.subject !== app.currentSubject) {
            app.currentSubject = q.subject;
            app.renderSubjectTabs();
            app.renderPalette();
        }

        document.getElementById('current-q-num').innerText = app.currentQuestionIndex + 1;
        document.getElementById('question-text').innerText = q.question;

        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const div = document.createElement('div');
            const isSelected = app.answers[app.currentQuestionIndex] === idx;
            div.className = `option-item ${isSelected ? 'selected' : ''}`;
            div.innerText = opt;
            div.onclick = () => app.selectAnswer(app.currentQuestionIndex, idx);
            optionsContainer.appendChild(div);
        });

        app.updatePalette();
    },

    selectAnswer: (qIdx, optionIdx) => {
        app.answers[qIdx] = optionIdx;
        app.renderQuestion();
        app.saveState();
    },

    nextQuestion: () => {
        if (app.currentQuestionIndex < app.questions.length - 1) {
            app.currentQuestionIndex++;
            app.renderQuestion();
        }
    },

    prevQuestion: () => {
        if (app.currentQuestionIndex > 0) {
            app.currentQuestionIndex--;
            app.renderQuestion();
        }
    },

    markForReview: () => {
        const qIdx = app.currentQuestionIndex;
        app.reviewStatus[qIdx] = !app.reviewStatus[qIdx];
        app.updatePalette();
        app.saveState();
    },

    clearResponse: () => {
        const qIdx = app.currentQuestionIndex;
        delete app.answers[qIdx];
        app.renderQuestion();
        app.saveState();
    },

    // Palette
    renderPalette: () => {
        const grid = document.getElementById('palette-grid');
        grid.innerHTML = '';

        // Only render questions for current Subject
        app.questions.forEach((q, idx) => {
            if (q.subject !== app.currentSubject) return;

            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.innerText = idx + 1;
            btn.id = `palette-btn-${idx}`;
            btn.onclick = () => {
                app.currentQuestionIndex = idx;
                app.renderQuestion();
            };
            grid.appendChild(btn);
        });
        app.updatePalette();
    },

    updatePalette: () => {
        app.questions.forEach((q, idx) => {
            if (q.subject !== app.currentSubject) return;

            const btn = document.getElementById(`palette-btn-${idx}`);
            if (!btn) return;

            const isAnswered = app.answers[idx] !== undefined;
            const isMarked = app.reviewStatus[idx];

            let classes = ['palette-btn'];
            if (idx === app.currentQuestionIndex) classes.push('active');

            if (isMarked) classes.push('marked');
            else if (isAnswered) classes.push('answered');
            else classes.push('not-answered');

            btn.className = classes.join(' ');
        });
    },

    // Submission
    submitExam: () => {
        if (app.timeRemaining > 0 && !confirm("Are you sure you want to submit?")) return;

        app.stopTimer();
        app.isExamActive = false;
        if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));

        localStorage.removeItem('examState');
        app.calculateResult();
        app.showSection('result-section');
    },

    // Chart Instance
    chartInstance: null,

    calculateResult: () => {
        let correct = 0;
        let wrong = 0;
        let score = 0;

        // Subject-wise stats
        // { 'Physics': { correct: 0, wrong: 0, total: 0 } }
        let subStats = {};
        app.subjects.forEach(sub => subStats[sub] = { correct: 0, wrong: 0, skipped: 0, score: 0, total: 0 });

        const config = app.examConfig[app.currentExamType];

        app.questions.forEach((q, idx) => {
            const userAns = app.answers[idx];
            if (!subStats[q.subject]) subStats[q.subject] = { correct: 0, wrong: 0, skipped: 0, score: 0, total: 0 };

            subStats[q.subject].total++;

            if (userAns !== undefined) {
                if (userAns === q.correctAnswer) {
                    correct++;
                    score += config.correct;
                    subStats[q.subject].correct++;
                    subStats[q.subject].score += config.correct;
                } else {
                    wrong++;
                    score += config.wrong;
                    subStats[q.subject].wrong++;
                    subStats[q.subject].score += config.wrong;
                }
            } else {
                subStats[q.subject].skipped++;
            }
        });

        const skipped = app.questions.length - (correct + wrong);
        const totalAttempts = correct + wrong;
        const accuracy = totalAttempts > 0 ? ((correct / totalAttempts) * 100).toFixed(1) : 0;

        // Render Results
        document.getElementById('total-score').innerText = score;
        document.getElementById('correct-count').innerText = correct;
        document.getElementById('wrong-count').innerText = wrong;
        document.getElementById('skipped-count').innerText = skipped;
        document.getElementById('accuracy-val').innerText = `${accuracy}%`;

        // Render Charts and Breakdown
        app.renderChart(correct, wrong, skipped);
        app.renderSubjectBreakdown(subStats);

        // Detailed Solution
        const solutionList = document.getElementById('solution-list');
        solutionList.innerHTML = '';

        app.questions.forEach((q, idx) => {
            const div = document.createElement('div');
            div.className = 'card';
            div.style.marginBottom = '1rem';

            const userAnsIdx = app.answers[idx];
            const isCorrect = userAnsIdx === q.correctAnswer;
            const statusClass = userAnsIdx === undefined ? 'grey' : (isCorrect ? 'green' : 'red');

            div.innerHTML = `
                <div style="border-left: 4px solid var(--${statusClass === 'grey' ? 'secondary' : (statusClass === 'green' ? 'success' : 'danger')}-color); padding-left: 1rem;">
                    <h4>Q${idx + 1} (${q.subject}): ${q.question}</h4>
                    <p><strong>Your Answer:</strong> ${userAnsIdx !== undefined ? q.options[userAnsIdx] : 'None'}</p>
                    <p><strong>Correct Answer:</strong> ${q.options[q.correctAnswer]}</p>
                    <p style="margin-top: 0.5rem; color: var(--secondary-color);"><em>Solution: ${q.solution}</em></p>
                </div>
            `;
            solutionList.appendChild(div);
        });

        // Add chart logic here or trigger it if calling outside
    },

    renderChart: (correct, wrong, skipped) => {
        const ctx = document.getElementById('performanceChart').getContext('2d');

        if (app.chartInstance) {
            app.chartInstance.destroy();
        }

        app.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Wrong', 'Skipped'],
                datasets: [{
                    data: [correct, wrong, skipped],
                    backgroundColor: ['#10b981', '#ef4444', '#6b7280'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    renderSubjectBreakdown: (subStats) => {
        const container = document.getElementById('subject-breakdown');
        container.innerHTML = '';

        Object.keys(subStats).forEach(subject => {
            const stats = subStats[subject];
            const div = document.createElement('div');
            div.className = 'subject-stat-item';

            div.innerHTML = `
                <div class="subject-stat-header">${subject}</div>
                <div class="subject-stat-row">
                    <span>Score</span>
                    <span style="font-weight: bold; color: var(--primary-color)">${stats.score}</span>
                </div>
                <div class="subject-stat-row">
                    <span>Attempted</span>
                    <span>${stats.correct + stats.wrong} / ${stats.total}</span>
                </div>
                <div class="subject-stat-row">
                    <span>Accuracy</span>
                    <span>${(stats.correct + stats.wrong) > 0 ? ((stats.correct / (stats.correct + stats.wrong)) * 100).toFixed(0) : 0}%</span>
                </div>
            `;
            container.appendChild(div);
        });
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', app.init);
