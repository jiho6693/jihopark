(() => {
  let previewMinutes = null;
  let previewSlider = null;
  let previewLabel = null;

  // 접속자 기기의 현지 시각을 기준으로 한 하루의 하늘색 키프레임.
  // 낮(08:00~16:30)은 기존 포트폴리오처럼 완전한 흰색을 유지한다.
  const SKY_COLORS = [
    { time: "00:00", color: "#050505" },
    { time: "04:30", color: "#050505" },
    { time: "05:10", color: "#07152f" },
    { time: "05:40", color: "#174b8c" },
    { time: "06:05", color: "#774f82" },
    { time: "06:25", color: "#d85e55" },
    { time: "06:50", color: "#f2a06f" },
    { time: "08:00", color: "#ffffff" },
    { time: "16:30", color: "#ffffff" },
    { time: "17:20", color: "#f2b06d" },
    { time: "18:10", color: "#e8523f" },
    { time: "18:40", color: "#8c344f" },
    { time: "19:20", color: "#18264c" },
    { time: "20:30", color: "#050505" },
    { time: "24:00", color: "#050505" }
  ].map(({ time, color }) => ({
    minutes: timeToMinutes(time),
    color: hexToRgb(color)
  }));

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  function interpolate(start, end, amount) {
    return Math.round(start + (end - start) * amount);
  }

  function colorAt(minutes) {
    for (let index = 0; index < SKY_COLORS.length - 1; index += 1) {
      const current = SKY_COLORS[index];
      const next = SKY_COLORS[index + 1];

      if (minutes >= current.minutes && minutes <= next.minutes) {
        const duration = next.minutes - current.minutes;
        const progress = duration === 0 ? 0 : (minutes - current.minutes) / duration;
        const smoothProgress = progress * progress * (3 - 2 * progress);

        return {
          r: interpolate(current.color.r, next.color.r, smoothProgress),
          g: interpolate(current.color.g, next.color.g, smoothProgress),
          b: interpolate(current.color.b, next.color.b, smoothProgress)
        };
      }
    }

    return SKY_COLORS[0].color;
  }

  function formatTime(minutes) {
    const roundedMinutes = Math.round(minutes) % 1440;
    const hours = Math.floor(roundedMinutes / 60);
    const minute = roundedMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function currentMinutes() {
    const now = new Date();
    return (
      now.getHours() * 60 +
      now.getMinutes() +
      now.getSeconds() / 60
    );
  }

  function updateSky() {
    const minutes = previewMinutes ?? currentMinutes();
    const color = colorAt(minutes);
    const background = `rgb(${color.r}, ${color.g}, ${color.b})`;

    // 사람이 체감하는 밝기에 따라 글자와 모든 라인의 색을 함께 바꾼다.
    const brightness = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
    const foreground = brightness < 145 ? "#ffffff" : "#010101";
    const root = document.documentElement;

    root.style.setProperty("--sky-color", background);
    root.style.setProperty("--foreground-color", foreground);

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", background);

    if (previewSlider && previewMinutes === null) {
      previewSlider.value = String(Math.floor(minutes));
    }

    if (previewLabel) {
      previewLabel.textContent = previewMinutes === null
        ? `실시간 ${formatTime(minutes)}`
        : formatTime(minutes);
    }
  }

  function createPreviewControl() {
    const control = document.createElement("div");
    control.className = "sky-time-control";
    control.setAttribute("aria-label", "하늘색 시간 미리보기");

    previewLabel = document.createElement("output");
    previewLabel.className = "sky-time-label";

    previewSlider = document.createElement("input");
    previewSlider.className = "sky-time-slider";
    previewSlider.type = "range";
    previewSlider.min = "0";
    previewSlider.max = "1439";
    previewSlider.step = "1";
    previewSlider.value = String(Math.floor(currentMinutes()));
    previewSlider.setAttribute("aria-label", "미리 볼 시간");

    const resetButton = document.createElement("button");
    resetButton.className = "sky-time-reset";
    resetButton.type = "button";
    resetButton.textContent = "실시간";

    previewSlider.addEventListener("input", () => {
      previewMinutes = Number(previewSlider.value);
      document.documentElement.classList.add("sky-previewing");
      updateSky();
    });

    resetButton.addEventListener("click", () => {
      previewMinutes = null;
      document.documentElement.classList.remove("sky-previewing");
      updateSky();
    });

    control.append(previewLabel, previewSlider, resetButton);
    document.body.append(control);
    control.hidden = new URLSearchParams(window.location.search).get("sky-debug") !== "1";

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping = target instanceof Element && target.matches(
        'textarea, [contenteditable="true"], input:not([type="range"])'
      );

      if (isTyping || !event.shiftKey || event.key.toLowerCase() !== "t") return;

      event.preventDefault();
      control.hidden = !control.hidden;

      if (control.hidden) {
        previewMinutes = null;
        document.documentElement.classList.remove("sky-previewing");
      } else if (previewMinutes === null) {
        previewSlider.value = String(Math.floor(currentMinutes()));
      }

      updateSky();
    });

    updateSky();
  }

  updateSky();
  window.setInterval(updateSky, 10000);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createPreviewControl, { once: true });
  } else {
    createPreviewControl();
  }
})();
