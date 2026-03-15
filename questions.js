window.questionBank = [
    ...Array.from({ length: 15 }, (_, i) => ({
        "id": i + 1,
        "question": `Physics Dummy Question ${i + 1}`,
        "options": [
            `Option A for Physics Q${i + 1}`,
            `Option B for Physics Q${i + 1}`,
            `Option C for Physics Q${i + 1}`,
            `Option D for Physics Q${i + 1}`
        ],
        "correctAnswer": 0,
        "solution": `Solution for Physics Q${i + 1}`,
        "subject": "Physics",
        "exam": "JEE Main",
        "year": "2023"
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
        "id": i + 16,
        "question": `Chemistry Dummy Question ${i + 1}`,
        "options": [
            `Option A for Chemistry Q${i + 1}`,
            `Option B for Chemistry Q${i + 1}`,
            `Option C for Chemistry Q${i + 1}`,
            `Option D for Chemistry Q${i + 1}`
        ],
        "correctAnswer": 1,
        "solution": `Solution for Chemistry Q${i + 1}`,
        "subject": "Chemistry",
        "exam": "JEE Main",
        "year": "2023"
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
        "id": i + 31,
        "question": `Mathematics Dummy Question ${i + 1}`,
        "options": [
            `Option A for Math Q${i + 1}`,
            `Option B for Math Q${i + 1}`,
            `Option C for Math Q${i + 1}`,
            `Option D for Math Q${i + 1}`
        ],
        "correctAnswer": 2,
        "solution": `Solution for Math Q${i + 1}`,
        "subject": "Mathematics",
        "exam": "JEE Main",
        "year": "2023"
    }))
];
