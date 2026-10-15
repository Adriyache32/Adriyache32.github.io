#!/usr/bin/env python3
import sys, os, time
from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QProgressBar
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont, QPalette, QColor

def get_mem():
    with open('/proc/meminfo') as f:
        d = {}
        for line in f:
            k, v = line.split(':')[0], line.split(':')[1].strip().split()[0]
            d[k] = int(v)
    total = d['MemTotal']
    avail = d['MemAvailable']
    used = total - avail
    ram_pct = used / total * 100
    swap_total = d.get('SwapTotal', 0)
    swap_free = d.get('SwapFree', 0)
    swap_used = swap_total - swap_free
    swap_pct = (swap_used / swap_total * 100) if swap_total > 0 else 0
    return ram_pct, swap_pct, used//1024, total//1024, swap_used//1024, swap_total//1024

def get_cpu():
    with open('/proc/stat') as f:
        line = f.readline()
    parts = [int(x) for x in line.split()[1:]]
    total = sum(parts)
    idle = parts[3]
    return total, idle

class SysMonOverlay(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Nervalia Monitor')
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setStyleSheet('background: rgba(0,0,0,0);')
        self.setFixedSize(200, 62)

        self.prev_total, self.prev_idle = get_cpu()
        self.prev_time = time.monotonic()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 3, 6, 3)
        layout.setSpacing(1)

        font_label = QFont('JetBrains Mono', 7)
        font_pct = QFont('JetBrains Mono', 7, QFont.Weight.Bold)

        def make_row(label_text, color):
            row = QHBoxLayout()
            row.setSpacing(4)
            lbl = QLabel(label_text)
            lbl.setFont(font_label)
            lbl.setStyleSheet(f'color: {color}; background: transparent;')
            lbl.setFixedWidth(30)
            bar = QProgressBar()
            bar.setFixedHeight(6)
            bar.setTextVisible(False)
            bar.setStyleSheet(f'''
                QProgressBar {{ background: rgba(255,255,255,0.08); border: none; border-radius: 3px; }}
                QProgressBar::chunk {{ background: {color}; border-radius: 3px; }}
            ''')
            pct = QLabel('0%')
            pct.setFont(font_pct)
            pct.setStyleSheet(f'color: {color}; background: transparent;')
            pct.setFixedWidth(28)
            pct.setAlignment(Qt.AlignmentFlag.AlignRight)
            row.addWidget(lbl)
            row.addWidget(bar, 1)
            row.addWidget(pct)
            return lbl, bar, pct, row

        self.lbl_cpu, self.bar_cpu, self.pct_cpu, row_cpu = make_row('CPU', '#7289da')
        self.lbl_ram, self.bar_ram, self.pct_ram, row_ram = make_row('RAM', '#43b581')
        self.lbl_swp, self.bar_swp, self.pct_swp, row_swp = make_row('SWP', '#f0c040')

        layout.addLayout(row_cpu)
        layout.addLayout(row_ram)
        layout.addLayout(row_swp)

        self._dragging = False
        self._drag_pos = None

        self.timer = QTimer()
        self.timer.timeout.connect(self.update_stats)
        self.timer.start(800)

        self.move(10, 60)
        self.show()

    def update_stats(self):
        total, idle = get_cpu()
        now = time.monotonic()
        dt = now - self.prev_time
        cpu_pct = max(0, min(100, (1 - (idle - self.prev_idle) / (total - self.prev_total)) * 100)) if dt > 0 else 0
        self.prev_total, self.prev_idle, self.prev_time = total, idle, now
        ram_pct, swap_pct, used_mb, total_mb, sw_used, sw_total = get_mem()

        self.bar_cpu.setValue(int(cpu_pct))
        self.pct_cpu.setText(f'{cpu_pct:.0f}%')
        self.bar_ram.setValue(int(ram_pct))
        self.pct_ram.setText(f'{ram_pct:.0f}%')
        self.bar_swp.setValue(int(swap_pct))
        self.pct_swp.setText(f'{swap_pct:.0f}%')

    def mousePressEvent(self, e):
        if e.button() == Qt.MouseButton.LeftButton:
            self._dragging = True
            self._drag_pos = e.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, e):
        if self._dragging:
            self.move(e.globalPosition().toPoint() - self._drag_pos)

    def mouseReleaseEvent(self, e):
        self._dragging = False

app = QApplication(sys.argv)
w = SysMonOverlay()
sys.exit(app.exec())
