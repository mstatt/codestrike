document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown timer
    initializeCountdown();
    
    // Form submission handling
    const form = document.getElementById('submissionForm');
    form.addEventListener('submit', handleSubmission);
});

function initializeCountdown() {
    fetch('/get_deadline')
        .then(response => response.json())
        .then(data => {
            const deadline = new Date(data.deadline).getTime();
            
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = deadline - now;
                
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                document.getElementById('countdown').innerHTML = 
                    `${days}d ${hours}h ${minutes}m ${seconds}s`;
                
                if (distance < 0) {
                    clearInterval(timer);
                    document.getElementById('countdown').innerHTML = "DEADLINE PASSED";
                    document.querySelector('button[type="submit"]').disabled = true;
                }
            }, 1000);
        })
        .catch(error => console.error('Error fetching deadline:', error));
}

function handleSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('email', document.getElementById('email').value);
    formData.append('github', document.getElementById('github').value);
    formData.append('video', document.getElementById('video').value);
    
    fetch('/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            document.getElementById('submissionForm').reset();
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while submitting the form');
    });
}
