import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduleGrid, validateScheduleTime } from '../shared/schedule.mjs';
test('validasi mengikuti durasi admin dan mengizinkan batas akhir sekolah', () => {
 const settings = {schedule_start:'07:00',schedule_end:'17:00',lesson_duration:45};
 assert.equal(validateScheduleTime('07:45','08:30', settings), '');
 assert.ok(validateScheduleTime('07:30','08:30', settings));
 assert.ok(validateScheduleTime('06:00','08:30', settings));
 assert.ok(validateScheduleTime('08:30','08:30', settings));
 assert.ok(validateScheduleTime('99:00','10:00', settings));
 assert.equal(validateScheduleTime('16:45','17:00', settings), '');
});
test('jadwal sisipan tidak menghilangkan jadwal berikutnya, termasuk menit manual', () => {
 const {grid,slots} = buildScheduleGrid([item(1,'07:00','11:00'),item(3,'13:00','16:00'),item(2,'11:00','12:00'),item(4,'12:10','12:40')], '2026-11-02', {lesson_duration:30});
 assert.equal(grid.Senin['13:00'].jadwal_id,3);
 assert.equal(grid.Senin['11:00'].jadwal_id,2);
 assert.equal(grid.Senin['12:10'].jadwal_id,4);
 assert.ok(slots.includes('12:40'));
});
const item = (id, start, end) => ({ jadwal_id:id, tanggal:'2026-11-02', jam_mulai:start, jam_selesai:end });
test('jadwal bersebelahan tidak bergeser dan batas akhir eksklusif', () => {
 const { grid } = buildScheduleGrid([item(1,'07:00','09:00'), item(2,'09:00','10:00')], '2026-11-02');
 assert.equal(grid.Senin['07:00'].rowspan, 2);
 assert.equal(grid.Senin['09:00'].jadwal_id, 2);
 assert.equal(grid.Senin['09:00'].rowspan, 1);
});
