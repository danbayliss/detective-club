// Word card
if (state.phase === 'wordEntry') {
  wordCard.style.display = 'block';
  wordCard.classList.add('slide-in');
  
  const wordInput = document.getElementById('wordInput');

  if (activeId === selfId) {
    // Active player enters the word
    wordInput.style.display = 'block';
    wordDisplay.style.display = 'none';
    revealWordBtn.style.display = 'block';
    
    // Clear input if word not submitted
    if (!state.word) wordInput.value = '';
    
    // Submit on Enter
    wordInput.onkeypress = function(e) {
      if (e.key === 'Enter' && wordInput.value.trim()) {
        socket.emit('submitWord', { code: currentRoom, word: wordInput.value.trim() });
        wordInput.disabled = true;
      }
    };
    
  } else if (state.blindId === selfId) {
    wordInput.style.display = 'none';
    wordDisplay.style.display = 'block';
    wordDisplay.textContent = 'You are the blind player';
    revealWordBtn.style.display = 'none';
  } else {
    wordInput.style.display = 'none';
    wordDisplay.style.display = 'block';
    wordDisplay.textContent = state.word ? state.word : 'Waiting for word...';
    revealWordBtn.style.display = 'none';
  }
} else {
  wordCard.style.display = 'none';
}
