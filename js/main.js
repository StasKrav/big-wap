class MediaPlayer {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentTrackIndex = -1;
    this.isPlaying = false;

    // Состояния для drag & drop
    this.dragSourceIndex = null;
    this.dragOverIndex = null;
    this.longPressTimer = null;
    this.longPressTriggered = false;

    this.initializeElements();
    this.attachEventListeners();
    this.initializeDragAndDrop();
    this.loadPlaylistFromStorage();
  }

  initializeElements() {
    this.playBtn = document.getElementById("playBtn");
    this.playIcon = document.getElementById("playIcon");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.progressBar = document.getElementById("progressBar");
    this.progress = document.getElementById("progress");
    this.currentTimeEl = document.getElementById("currentTime");
    this.durationEl = document.getElementById("duration");
    this.currentTrackTitle = document.getElementById("currentTrackTitle");
    this.currentTrackArtist = document.getElementById("currentTrackArtist");
    this.playlistContainer = document.getElementById("playlist");
    this.addFilesBtn = document.getElementById("addFilesBtn");
    this.addFolderBtn = document.getElementById("addFolderBtn");
    this.clearPlaylistBtn = document.getElementById("clearPlaylistBtn");
    this.fileInput = document.getElementById("fileInput");
    this.folderInput = document.getElementById("folderInput");
    this.stopBtn = document.getElementById("stopBtn");
    this.rewind1Btn = document.getElementById("rewind1Btn");
    this.rewind10Btn = document.getElementById("rewind10Btn");
    this.forward1Btn = document.getElementById("forward1Btn");
    this.forward10Btn = document.getElementById("forward10Btn");

     // Volume elements
    this.volumeToggle = document.getElementById('volumeToggle');
    this.volumePopup = document.getElementById('volumePopup');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.volumeValue = document.getElementById('volumeValue');
    this.volumePercent = document.getElementById('volumePercent');
    this.muteBtn = document.getElementById('muteBtn');
    this.isMuted = false;
    this.previousVolume = 0.8;
    this.isVolumePopupOpen = false;
  }

  attachEventListeners() {
    this.playBtn.addEventListener("click", () => this.togglePlay());
    this.prevBtn.addEventListener("click", () => this.playPrevious());
    this.nextBtn.addEventListener("click", () => this.playNext());

    this.progressBar.addEventListener("click", (e) => this.seek(e));

    this.audio.addEventListener("timeupdate", () => this.updateProgress());
    this.audio.addEventListener("loadedmetadata", () => this.updateDuration());
    this.audio.addEventListener("ended", () => this.playNext());
    this.audio.addEventListener("error", (e) => this.handleError(e));

    this.addFilesBtn.addEventListener("click", () => this.fileInput.click());
    this.addFolderBtn.addEventListener("click", () => this.handleFolderSelect());
    this.clearPlaylistBtn.addEventListener("click", () => this.clearPlaylist());

    this.fileInput.addEventListener("change", (e) =>
      this.handleFiles(e.target.files),
    );
    this.folderInput.addEventListener("change", (e) => {
        if (!('showDirectoryPicker' in window)) {
            this.handleFiles(e.target.files);
        }
        this.folderInput.value = '';
    });

    this.stopBtn.addEventListener("click", () => this.stop());
    this.rewind1Btn.addEventListener("click", () => this.rewind(-1));
    this.rewind10Btn.addEventListener("click", () => this.rewind(-10));
    this.forward1Btn.addEventListener("click", () => this.rewind(1));
    this.forward10Btn.addEventListener("click", () => this.rewind(10));

    this.playlistContainer.addEventListener('click', (e) => {
            // Проверяем, что клик был по пустому состоянию или его элементам
            const emptyState = e.target.closest('.empty-state');
            if (emptyState) {
                this.fileInput.click(); // Открываем выбор файлов
            }
        });

    // Делегирование кликов для плейлиста
    this.playlistContainer.addEventListener("click", (e) => {
      // Находим элемент плейлиста
      const item = e.target.closest(".playlist-item");
      if (!item) return;

      // Проверяем, не кликнули ли по drag-handle или кнопке удаления
      if (
        e.target.closest(".drag-handle") ||
        e.target.closest(".control-btn")
      ) {
        return;
      }

      const index = parseInt(item.dataset.index);
      this.playTrack(index);
    });

    // Volume toggle
        this.volumeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleVolumePopup();
        });
        
        // Volume slider
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            this.setVolume(volume);
        });
        
        // Mute button
        this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });
        
        // Закрытие popup при клике вне
        document.addEventListener('click', (e) => {
            if (this.isVolumePopupOpen && !e.target.closest('.volume-wrapper')) {
                this.closeVolumePopup();
            }
        });
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVolumePopupOpen) {
                this.closeVolumePopup();
            }
        });
        
        // Загрузка сохраненной громкости
        this.loadVolumeFromStorage();

    document.addEventListener('keydown', (e) => {
        // Игнорируем если в поле ввода
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
    
        // Play/Pause - пробел
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePlay();
        }
        // Стоп - S
        else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.stop();
        }
        // Перемотка
        else if (e.code === 'ArrowLeft') {
            if (e.shiftKey) {
                e.preventDefault();
                this.rewind(-10);
            } else if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.rewind(-1);
            }
        }
        else if (e.code === 'ArrowRight') {
            if (e.shiftKey) {
                e.preventDefault();
                this.rewind(10);
            } else if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.rewind(1);
            }
        }
        // Громкость
        else if (e.code === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const newVolume = Math.min(1, this.audio.volume + 0.05);
            this.setVolume(newVolume);
        }
        else if (e.code === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const newVolume = Math.max(0, this.audio.volume - 0.05);
            this.setVolume(newVolume);
        }
        // Навигация по трекам
        else if (e.code === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            this.playPrevious();
        }
        else if (e.code === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            this.playNext();
        }
    });
  }

  initializeDragAndDrop() {
    // Drag & drop события будут обрабатываться через делегирование
    this.playlistContainer.addEventListener("dragstart", (e) =>
      this.handleDragStart(e),
    );
    this.playlistContainer.addEventListener("dragend", (e) =>
      this.handleDragEnd(e),
    );
    this.playlistContainer.addEventListener("dragover", (e) =>
      this.handleDragOver(e),
    );
    this.playlistContainer.addEventListener("drop", (e) => this.handleDrop(e));

    // Touch события
    this.playlistContainer.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e),
      { passive: false },
    );
    this.playlistContainer.addEventListener(
      "touchmove",
      (e) => this.handleTouchMove(e),
      { passive: false },
    );
    this.playlistContainer.addEventListener("touchend", (e) =>
      this.handleTouchEnd(e),
    );
    this.playlistContainer.addEventListener("touchcancel", (e) =>
      this.handleTouchCancel(e),
    );
  }

  // ========== Drag & Drop методы ==========

  handleDragStart(e) {
      const handle = e.target.closest('.drag-handle');
      if (!handle) {
          e.preventDefault();
          return false;
      }
  
      const item = handle.closest('.playlist-item');
      if (!item) return false;
  
      this.dragSourceIndex = parseInt(item.dataset.index);
      item.classList.add('dragging');
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.dragSourceIndex);
  }

  handleDragEnd(e) {
    const item = e.target.closest(".playlist-item");
    if (item) {
      item.classList.remove("dragging");
    }

    this.clearAllDragIndicators();
    this.dragSourceIndex = null;
    this.dragOverIndex = null;
  }

  handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (this.dragSourceIndex === null) return;
      
      const item = e.target.closest('.playlist-item');
      if (!item) return;
      
      const index = parseInt(item.dataset.index);
      if (index === this.dragSourceIndex) {
          this.clearAllDragIndicators();
          return;
      }
      
      this.clearAllDragIndicators();
      item.classList.add('drag-over');
      this.dragOverIndex = index;
  }
  
  handleDrop(e) {
      e.preventDefault();
      
      if (this.dragSourceIndex === null || this.dragOverIndex === null) {
          this.clearAllDragIndicators();
          return;
      }
      
      const sourceIndex = this.dragSourceIndex;
      let targetIndex = this.dragOverIndex;
      
      if (sourceIndex < targetIndex) {
          targetIndex--;
      }
      
      if (sourceIndex === targetIndex) {
          this.clearAllDragIndicators();
          return;
      }
      
      const [movedTrack] = this.playlist.splice(sourceIndex, 1);
      this.playlist.splice(targetIndex, 0, movedTrack);
      
      if (this.currentTrackIndex === sourceIndex) {
          this.currentTrackIndex = targetIndex;
      } else if (sourceIndex < this.currentTrackIndex && targetIndex >= this.currentTrackIndex) {
          this.currentTrackIndex--;
      } else if (sourceIndex > this.currentTrackIndex && targetIndex <= this.currentTrackIndex) {
          this.currentTrackIndex++;
      }
      
      this.clearAllDragIndicators();
      this.renderPlaylist();
      this.savePlaylistToStorage();
      
      this.dragSourceIndex = null;
      this.dragOverIndex = null;
  }

  clearAllDragIndicators() {
    const items = this.playlistContainer.querySelectorAll(".playlist-item");
    items.forEach((item) => {
      item.classList.remove("drag-over", "dragging");
      item.style.borderBottom = "";
      item.style.marginBottom = "";
      item.style.paddingBottom = "";
    });
  }


  // ========== Основные методы плеера ==========

  handleFiles(files) {
    const audioFiles = Array.from(files).filter(
      (file) =>
        file.type.startsWith("audio/") ||
        file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i),
    );

    if (audioFiles.length === 0) {
      Toast.show("Выбранные файлы не являются аудиофайлами", "warning");
      return;
    }

    audioFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      const track = {
        title: this.getFileNameWithoutExtension(file.name),
        artist: "Неизвестный исполнитель",
        duration: 0,
        url: url,
        file: file,
        name: file.name,
      };
      this.addToPlaylist(track);
    });

    if (this.currentTrackIndex === -1 && this.playlist.length > 0) {
      this.playTrack(0);
    }
  }

  async handleFolderSelect() {
      try {
          if (!('showDirectoryPicker' in window)) {
              this.folderInput.click();
              return;
          }
  
          // Запрашиваем доступ ТОЛЬКО ДЛЯ ЧТЕНИЯ
          const dirHandle = await window.showDirectoryPicker({
              mode: 'read'  // 👈 КЛЮЧЕВОЙ ПАРАМЕТР
          });
          
          const audioFiles = [];
          await this.traverseDirectory(dirHandle, audioFiles);
          
          if (audioFiles.length === 0) {
              console.log('В папке нет аудиофайлов');
              return;
          }
          
          this.handleFiles(audioFiles);
          
      } catch (err) {
          if (err.name === 'AbortError' || err.name === 'SecurityError') {
              console.log('Выбор папки отменен');
          } else {
              console.error('Ошибка при выборе папки:', err);
          }
      }
  }
  
  async traverseDirectory(dirHandle, audioFiles) {
      for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
              const fileName = entry.name.toLowerCase();
              if (fileName.match(/\.(mp3|wav|flac|ogg|m4a|aac|wma|aiff)$/i)) {
                  try {
                      const file = await entry.getFile();
                      audioFiles.push(file);
                  } catch (err) {
                      console.error('Ошибка чтения файла:', entry.name, err);
                  }
              }
          } else if (entry.kind === 'directory') {
              await this.traverseDirectory(entry, audioFiles);
          }
      }
  }

  getFileNameWithoutExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
  }

  addToPlaylist(track) {
    this.playlist.push(track);
    this.renderPlaylist();
    this.savePlaylistToStorage();
  }

  removeFromPlaylist(index) {
    if (this.currentTrackIndex === index) {
      this.stop();
    }

    URL.revokeObjectURL(this.playlist[index].url);
    this.playlist.splice(index, 1);

    if (this.currentTrackIndex > index) {
      this.currentTrackIndex--;
    } else if (this.currentTrackIndex === index && this.playlist.length > 0) {
      this.currentTrackIndex = Math.min(index, this.playlist.length - 1);
      this.playTrack(this.currentTrackIndex);
    }

    this.renderPlaylist();
    this.savePlaylistToStorage();
  }

  clearPlaylist() {
    this.stop();
    this.playlist.forEach((track) => URL.revokeObjectURL(track.url));
    this.playlist = [];
    this.currentTrackIndex = -1;
    this.renderPlaylist();
    this.savePlaylistToStorage();
    this.updateNowPlaying();
  }

  toggleVolumePopup() {
      if (this.isVolumePopupOpen) {
          this.closeVolumePopup();
      } else {
          this.openVolumePopup();
      }
  }
  
  openVolumePopup() {
      this.isVolumePopupOpen = true;
      this.volumePopup.classList.add('active');
  }
  
  closeVolumePopup() {
      this.isVolumePopupOpen = false;
      this.volumePopup.classList.remove('active');
  }
  
  setVolume(volume) {
      this.audio.volume = volume;
      this.volumeSlider.value = volume;
      const percent = Math.round(volume * 100);
      this.volumeValue.textContent = percent + '%';
      this.volumePercent.textContent = percent + '%';
      
      // Обновляем иконку mute
      this.updateMuteIcon();
      
      // Сохраняем настройки
      this.saveVolumeToStorage();
  }
  
  toggleMute() {
      if (this.isMuted) {
          this.setVolume(this.previousVolume);
          this.isMuted = false;
      } else {
          this.previousVolume = this.audio.volume;
          this.setVolume(0);
          this.isMuted = true;
      }
      this.updateMuteIcon();
  }
  
  updateMuteIcon() {
      const isMuted = this.isMuted || this.audio.volume === 0;
      if (isMuted) {
          this.muteBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <line x1="23" y1="9" x2="17" y2="15"/>
                  <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
          `;
          this.muteBtn.classList.add('muted');
          this.volumeToggle.querySelector('svg').innerHTML = `
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
          `;
      } else {
          this.muteBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
          `;
          this.muteBtn.classList.remove('muted');
          this.volumeToggle.querySelector('svg').innerHTML = `
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          `;
      }
  }
  
  saveVolumeToStorage() {
      try {
          localStorage.setItem('playerVolume', this.audio.volume.toString());
          localStorage.setItem('playerMuted', this.isMuted ? 'true' : 'false');
      } catch (e) {
          console.warn('Не удалось сохранить громкость:', e);
      }
  }
  
  loadVolumeFromStorage() {
      try {
          const savedVolume = localStorage.getItem('playerVolume');
          if (savedVolume !== null) {
              const volume = parseFloat(savedVolume);
              if (!isNaN(volume) && volume >= 0 && volume <= 1) {
                  this.setVolume(volume);
                  this.volumeSlider.value = volume;
                  this.volumeValue.textContent = Math.round(volume * 100) + '%';
                  this.volumePercent.textContent = Math.round(volume * 100) + '%';
              }
          }
          
          const savedMuted = localStorage.getItem('playerMuted');
          if (savedMuted === 'true') {
              this.isMuted = true;
              this.previousVolume = this.audio.volume || 0.8;
              this.setVolume(0);
              this.updateMuteIcon();
          }
      } catch (e) {
          console.warn('Не удалось загрузить громкость:', e);
          this.setVolume(0.8);
      }
  }
  

  playTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;

    this.currentTrackIndex = index;
    const track = this.playlist[index];

    this.audio.src = track.url;
    this.audio.load();

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.updatePlayButton();
        this.updateNowPlaying();
        this.renderPlaylist();
      })
      .catch((error) => {
        console.error("Ошибка воспроизведения:", error);
      });
      this.scrollToActiveTrack(); 
  }

  togglePlay() {
    if (this.playlist.length === 0) return;

    if (this.currentTrackIndex === -1) {
      this.playTrack(0);
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch((error) => {
        console.error("Ошибка воспроизведения:", error);
      });
    }

    this.isPlaying = !this.isPlaying;
    this.updatePlayButton();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.updatePlayButton();
    this.updateProgress();
  }

  playNext() {
    if (this.playlist.length === 0) return;

    let nextIndex = this.currentTrackIndex + 1;
    if (nextIndex >= this.playlist.length) {
      nextIndex = 0;
    }

    this.playTrack(nextIndex);
    this.scrollToActiveTrack(); 
  }

  playPrevious() {
    if (this.playlist.length === 0) return;

    let prevIndex = this.currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.playlist.length - 1;
    }

    this.playTrack(prevIndex);
    this.scrollToActiveTrack(); 
  }

  rewind(seconds) {
    if (this.playlist.length === 0 || this.currentTrackIndex === -1) return;

    let newTime = this.audio.currentTime + seconds;
    newTime = Math.max(0, Math.min(newTime, this.audio.duration || 0));
    this.audio.currentTime = newTime;
  }

  seek(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = percent * this.audio.duration;
  }

  updateProgress() {
    if (this.audio.duration) {
      const percent = (this.audio.currentTime / this.audio.duration) * 100;
      this.progress.style.width = percent + "%";
      this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
  }

  updateDuration() {
    if (this.audio.duration && !isNaN(this.audio.duration)) {
      this.durationEl.textContent = this.formatTime(this.audio.duration);

      if (this.currentTrackIndex >= 0) {
        this.playlist[this.currentTrackIndex].duration = this.audio.duration;
      }
    }
  }

  updateNowPlaying() {
    if (
      this.currentTrackIndex >= 0 &&
      this.currentTrackIndex < this.playlist.length
    ) {
      const track = this.playlist[this.currentTrackIndex];
      this.currentTrackTitle.textContent = track.title;
      this.currentTrackArtist.textContent = track.artist;
    } else {
      this.currentTrackTitle.textContent = "Выберите трек";
      this.currentTrackArtist.textContent = "Нет активного трека";
      this.progress.style.width = "0%";
      this.currentTimeEl.textContent = "0:00";
      this.durationEl.textContent = "0:00";
    }
  }

  updatePlayButton() {
      if (this.isPlaying) {
          this.playIcon.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
          `;
      } else {
          this.playIcon.innerHTML = `
              <path d="M8 5v14l11-7z"/>
          `;
      }
  }

  handleError(e) {
    console.error("Ошибка аудио:", e);
    Toast.show("Ошибка воспроизведения файла", "error", 5000);
    this.playNext();
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  renderPlaylist() {
    if (this.playlist.length === 0) {
      this.playlistContainer.innerHTML = `
                        <div class="empty-state">
                            <p>Плейлист пуст</p>
                            <p style="font-size: 14px;">Добавьте аудиофайлы для воспроизведения</p>
                        </div>
                    `;
      return;
    }

    this.playlistContainer.innerHTML = this.playlist
      .map(
        (track, index) => `
                    <div class="playlist-item ${index === this.currentTrackIndex ? "active" : ""}" 
                         data-index="${index}">
                        <div class="drag-handle" draggable="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="9" cy="5" r="1"/>
                                <circle cx="15" cy="5" r="1"/>
                                <circle cx="9" cy="12" r="1"/>
                                <circle cx="15" cy="12" r="1"/>
                                <circle cx="9" cy="19" r="1"/>
                                <circle cx="15" cy="19" r="1"/>
                            </svg>
                        </div>
                        <div class="playlist-item-number">${(index + 1).toString().padStart(2, "0")}</div>
                        <div class="playlist-item-info">
                            <div class="playlist-item-title">${this.escapeHtml(track.title)}</div>
                        </div>
                        <div class="playlist-item-duration">
                            ${track.duration ? this.formatTime(track.duration) : "--:--"}
                        </div>
                        <button class="control-btn" 
                                onclick="player.removeFromPlaylist(${index})" 
                                style="padding: 4px; margin-left: 8px;" 
                                title="Удалить">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 6L6 18"/>
                                <path d="M6 6L18 18"/>
                            </svg>
                        </button>
                    </div>
                `,
      )
      .join("");

      // Скроллим к активному треку
          setTimeout(() => {
              this.scrollToActiveTrack();
          }, 50);
  }

  savePlaylistToStorage() {
    try {
      const playlistData = this.playlist.map((track) => ({
        name: track.name || track.title,
        title: track.title,
        artist: track.artist,
      }));
      localStorage.setItem("playlistData", JSON.stringify(playlistData));
    } catch (e) {
      console.warn("Не удалось сохранить плейлист:", e);
    }
  }

  loadPlaylistFromStorage() {
    try {
      const savedData = localStorage.getItem("playlistData");
      if (savedData) {
        const playlistData = JSON.parse(savedData);
        console.log("Ранее сохраненный плейлист:", playlistData);
      }
    } catch (e) {
      console.warn("Не удалось загрузить плейлист:", e);
    }
  }

  scrollToActiveTrack() {
      const activeItem = this.playlistContainer.querySelector('.playlist-item.active');
      if (activeItem) {
          // Плавно скроллим к активному треку
          activeItem.scrollIntoView({
              behavior: 'smooth',
              block: 'center', // Центрируем по вертикали
              inline: 'nearest'
          });
      }
  }
}

// Инициализация плеера
const player = new MediaPlayer();
