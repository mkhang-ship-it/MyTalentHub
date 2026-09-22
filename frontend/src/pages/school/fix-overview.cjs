const fs = require('fs');
let content = fs.readFileSync('/tmp/FT/talenthub/frontend/src/pages/school/Overview.tsx', 'utf8');

// Fix the bar chart section - using the exact content with &
const oldSection = `        <Card>
          <h2 className="font-semibold text-ink mb-1">Tham gia & hoàn thành — 6 tháng</h2>
          <div className="flex items-center gap-4 text-xs text-muted mb-4">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Đăng ký</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pink-500" /> Hoàn thành</span>
          </div>
          <div className="flex items-end gap-3 h-44">
            {data.monthly.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 h-32">
                  <div
                    className="w-4 rounded-t bg-orange-500"
                    style={{ height: \`\${Math.max(3, (m.registrations / maxMonthly) * 100)}%\` }}
                    title={\`\${m.registrations} đăng ký\`}
                  />
                  <div
                    className="w-4 rounded-t bg-pink-500"
                    style={{ height: \`\${Math.max(3, (m.completions / maxMonthly) * 100)}%\` }}
                    title={\`\${m.completions} hoàn thành\`}
                  />
                </div>
                <span className="text-xs text-muted-light">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-portal-soft border border-portal-soft p-4 text-sm text-ink">
            <School size={16} className="inline mr-1.5" />
            Mỗi học sinh nên tích lũy <b>ít nhất 10 giờ/năm</b> để hoàn thành mục tiêu trải nghiệm.
          </div>
        </Card>`;

const newSection = `        <Card>
          <h2 className="font-semibold text-ink mb-1">Tham gia & hoàn thành — 6 tháng</h2>
          <div className="flex items-center gap-4 text-xs text-muted mb-4" role="legend" aria-label="Chú thích biểu đồ">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" aria-hidden="true" /> Đăng ký</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pink-500" aria-hidden="true" /> Hoàn thành</span>
          </div>
          <div 
            className="flex items-end gap-3 h-44" 
            role="img" 
            aria-label={\`Biểu đồ cột 6 tháng tham gia và hoàn thành: \${data.monthly.map(m => \`Tháng \${m.month}: \${m.registrations} đăng ký, \${m.completions} hoàn thành\`).join("; ")}\`}
            tabIndex={0}
          >
            {data.monthly.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 h-32" role="group" aria-label={\`Tháng \${m.month}: \${m.registrations} đăng ký, \${m.completions} hoàn thành\`}>
                  <div
                    className="w-4 rounded-t bg-orange-500"
                    style={{ height: \`\${Math.max(3, (m.registrations / maxMonthly) * 100)}%\` }}
                    aria-label={\`\${m.registrations} đăng ký\`}
                    role="img"
                  />
                  <div
                    className="w-4 rounded-t bg-pink-500"
                    style={{ height: \`\${Math.max(3, (m.completions / maxMonthly) * 100)}%\` }}
                    aria-label={\`\${m.completions} hoàn thành\`}
                    role="img"
                  />
                </div>
                <span className="text-xs text-muted-light">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-portal-soft border border-portal-soft p-4 text-sm text-ink">
            <School size={16} className="inline mr-1.5" aria-hidden="true" />
            Mỗi học sinh nên tích lũy <b>ít nhất 10 giờ/năm</b> để hoàn thành mục tiêu trải nghiệm.
          </div>
        </Card>`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync('/tmp/FT/talenthub/frontend/src/pages/school/Overview.tsx', content);
  console.log('Updated successfully');
} else {
  console.log('Not found - searching for partial...');
  // Try to find a partial match
  const idx = content.indexOf('Tham gia');
  if (idx !== -1) {
    console.log('Found at index:', idx);
    console.log(content.substring(idx, idx + 200));
  }
}