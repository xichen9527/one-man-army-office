const fs = require('fs');
const path = 'D:\\代码\\one-man-army-office\\src\\pages\\SocialMedia.tsx';
let content = fs.readFileSync(path, 'utf-8');

const startMarker = '        {/* ========== Trending ========== */}';
const endMarker = '        {/* ========== Analytics ========== */}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1) { console.log('Start not found'); process.exit(1); }
if (endIdx === -1) { console.log('End not found'); process.exit(1); }

console.log('Start:', startIdx, 'End:', endIdx);

// New content for the Trending tab
const newContent = `        {/* ========== Trending ========== */}
        <TabsContent value="trending">
          <TrendingMaterials
            onWriteFromTrending={handleWriteFromTrending}
            setActiveTab={setActiveTab}
            setShowNewPost={setShowNewPost}
          />
        </TabsContent>`;

const newFileContent = content.substring(0, startIdx) + newContent + content.substring(endIdx);

fs.writeFileSync(path, newFileContent, 'utf-8');
console.log('Done! File updated successfully.');
