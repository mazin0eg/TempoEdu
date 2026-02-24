Set-Location "c:\Users\zougu\OneDrive\Desktop\TempoEdu"
$tmp = "$env:TEMP\_tempoedu_backup"
$B = "TempoEdu-backend"
$F = "TempoEdu-frontend"

function Rf($rel) {
    $src = Join-Path $tmp $rel
    $dst = Join-Path "c:\Users\zougu\OneDrive\Desktop\TempoEdu" $rel
    $dir = Split-Path $dst
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item $src $dst -Force
}

function Cm($msg, $date) {
    $env:GIT_AUTHOR_DATE = $date
    $env:GIT_COMMITTER_DATE = $date
    git add -A 2>$null
    git commit -m $msg 2>$null
    Remove-Item Env:\GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
    Remove-Item Env:\GIT_COMMITTER_DATE -ErrorAction SilentlyContinue
    Write-Host "  $msg" -ForegroundColor Gray
}

# Prepare orphan branch
git checkout --orphan temp-rewrite 2>$null
git rm -rf . 2>$null
# Clean untracked (ignore errors from OneDrive locked files)
Get-ChildItem -Force | Where-Object { $_.Name -ne '.git' -and $_.Name -ne 'make-commits.ps1' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Starting commit creation..." -ForegroundColor Green

# == Day 1: Feb 24 ==
Rf "$B/.gitignore"; Rf "$B/.gitattributes"; Rf "$B/README.md"
Cm "chore: initialize project repository" "2026-02-24T09:00:00"

Rf "$B/package.json"; Rf "$B/package-lock.json"
Cm "chore(backend): add package.json with NestJS dependencies" "2026-02-24T09:30:00"

Rf "$B/tsconfig.json"; Rf "$B/tsconfig.build.json"; Rf "$B/nest-cli.json"
Cm "chore(backend): add TypeScript and NestJS configuration" "2026-02-24T10:00:00"

Rf "$B/eslint.config.mjs"; Rf "$B/.prettierrc"
Cm "chore(backend): add ESLint and Prettier config" "2026-02-24T10:20:00"

Rf "$B/src/main.ts"
Cm "feat(backend): add main bootstrap with CORS and Swagger" "2026-02-24T10:45:00"

Rf "$B/src/app.module.ts"; Rf "$B/src/app.controller.ts"; Rf "$B/src/app.service.ts"
Cm "feat(backend): add app module, controller, and service" "2026-02-24T11:10:00"

Rf "$B/src/app.controller.spec.ts"; Rf "$B/test/app.e2e-spec.ts"; Rf "$B/test/jest-e2e.json"
Cm "test(backend): add unit and e2e test boilerplate" "2026-02-24T11:30:00"

# == Day 2: Feb 25 ==
Rf "$B/src/common/filters/http-exception.filter.ts"; Rf "$B/src/common/filters/index.ts"
Cm "feat(backend): add global exception filter" "2026-02-25T09:00:00"

Rf "$B/src/common/interceptors/transform.interceptor.ts"; Rf "$B/src/common/interceptors/index.ts"
Cm "feat(backend): add response transform interceptor" "2026-02-25T09:25:00"

Rf "$B/src/common/decorators/roles.decorator.ts"; Rf "$B/src/common/decorators/current-user.decorator.ts"; Rf "$B/src/common/decorators/index.ts"
Cm "feat(backend): add Roles and CurrentUser decorators" "2026-02-25T09:50:00"

Rf "$B/src/common/guards/roles.guard.ts"; Rf "$B/src/common/guards/index.ts"
Cm "feat(backend): add RolesGuard for RBAC" "2026-02-25T10:15:00"

Rf "$B/src/modules/auth/strategies/jwt.strategy.ts"
Cm "feat(auth): add JWT passport strategy" "2026-02-25T10:45:00"

Rf "$B/src/modules/auth/dto/login.dto.ts"; Rf "$B/src/modules/auth/dto/register.dto.ts"; Rf "$B/src/modules/auth/dto/index.ts"
Cm "feat(auth): add login and register DTOs with validation" "2026-02-25T11:10:00"

Rf "$B/src/modules/auth/auth.service.ts"
Cm "feat(auth): implement auth service with register and login" "2026-02-25T11:40:00"

Rf "$B/src/modules/auth/auth.controller.ts"
Cm "feat(auth): add auth controller with login/register endpoints" "2026-02-25T12:00:00"

Rf "$B/src/modules/auth/auth.module.ts"
Cm "feat(auth): wire auth module with JWT and Passport" "2026-02-25T12:20:00"

# == Day 3: Feb 26 ==
Rf "$B/src/modules/users/schemas/user.schema.ts"
Cm "feat(users): add User Mongoose schema" "2026-02-26T09:00:00"

Rf "$B/src/modules/users/dto/update-user.dto.ts"
Cm "feat(users): add update user DTO" "2026-02-26T09:20:00"

Rf "$B/src/modules/users/users.service.ts"
Cm "feat(users): implement users service with CRUD operations" "2026-02-26T09:50:00"

Rf "$B/src/modules/users/users.controller.ts"
Cm "feat(users): add users controller with profile endpoints" "2026-02-26T10:15:00"

Rf "$B/src/modules/users/users.module.ts"
Cm "feat(users): wire users module" "2026-02-26T10:30:00"

Rf "$B/src/modules/skills/schemas/skill.schema.ts"
Cm "feat(skills): add Skill Mongoose schema" "2026-02-26T11:00:00"

Rf "$B/src/modules/skills/dto/create-skill.dto.ts"; Rf "$B/src/modules/skills/dto/update-skill.dto.ts"; Rf "$B/src/modules/skills/dto/index.ts"
Cm "feat(skills): add skill DTOs with validation" "2026-02-26T11:20:00"

Rf "$B/src/modules/skills/skills.service.ts"
Cm "feat(skills): implement skills service" "2026-02-26T11:50:00"

Rf "$B/src/modules/skills/skills.controller.ts"
Cm "feat(skills): add skills controller with search and CRUD" "2026-02-26T12:10:00"

Rf "$B/src/modules/skills/skills.module.ts"
Cm "feat(skills): wire skills module" "2026-02-26T12:25:00"

# == Day 4: Feb 27 ==
Rf "$B/src/modules/sessions/schemas/session.schema.ts"
Cm "feat(sessions): add Session schema with status enum" "2026-02-27T09:00:00"

Rf "$B/src/modules/sessions/dto/create-session.dto.ts"; Rf "$B/src/modules/sessions/dto/update-session.dto.ts"; Rf "$B/src/modules/sessions/dto/index.ts"
Cm "feat(sessions): add session DTOs" "2026-02-27T09:25:00"

Rf "$B/src/modules/sessions/sessions.service.ts"
Cm "feat(sessions): implement sessions service with status workflow" "2026-02-27T10:00:00"

Rf "$B/src/modules/sessions/sessions.controller.ts"
Cm "feat(sessions): add sessions controller" "2026-02-27T10:30:00"

Rf "$B/src/modules/sessions/sessions.module.ts"
Cm "feat(sessions): wire sessions module" "2026-02-27T10:45:00"

# == Day 5: Feb 28 ==
Rf "$B/src/modules/reviews/schemas/review.schema.ts"
Cm "feat(reviews): add Review schema" "2026-02-28T09:00:00"

Rf "$B/src/modules/reviews/dto/create-review.dto.ts"
Cm "feat(reviews): add create review DTO" "2026-02-28T09:20:00"

Rf "$B/src/modules/reviews/reviews.service.ts"
Cm "feat(reviews): implement reviews service" "2026-02-28T09:45:00"

Rf "$B/src/modules/reviews/reviews.controller.ts"
Cm "feat(reviews): add reviews controller" "2026-02-28T10:05:00"

Rf "$B/src/modules/reviews/reviews.module.ts"
Cm "feat(reviews): wire reviews module" "2026-02-28T10:20:00"

Rf "$B/src/modules/credits/schemas/transaction.schema.ts"
Cm "feat(credits): add Transaction schema" "2026-02-28T10:50:00"

Rf "$B/src/modules/credits/credits.service.ts"
Cm "feat(credits): implement credits service with transfer logic" "2026-02-28T11:15:00"

Rf "$B/src/modules/credits/credits.controller.ts"
Cm "feat(credits): add credits controller" "2026-02-28T11:35:00"

Rf "$B/src/modules/credits/credits.module.ts"
Cm "feat(credits): wire credits module" "2026-02-28T11:50:00"

# == Day 6: Mar 1 ==
Rf "$B/src/modules/chat/schemas/conversation.schema.ts"; Rf "$B/src/modules/chat/schemas/message.schema.ts"
Cm "feat(chat): add Conversation and Message schemas" "2026-03-01T09:00:00"

Rf "$B/src/modules/chat/chat.service.ts"
Cm "feat(chat): implement chat service" "2026-03-01T09:30:00"

Rf "$B/src/modules/chat/chat.gateway.ts"
Cm "feat(chat): add WebSocket gateway for real-time messaging" "2026-03-01T10:00:00"

Rf "$B/src/modules/chat/chat.controller.ts"
Cm "feat(chat): add chat REST controller" "2026-03-01T10:20:00"

Rf "$B/src/modules/chat/chat.module.ts"
Cm "feat(chat): wire chat module" "2026-03-01T10:35:00"

Rf "$B/src/modules/notifications/schemas/notification.schema.ts"
Cm "feat(notifications): add Notification schema" "2026-03-01T11:00:00"

Rf "$B/src/modules/notifications/notifications.service.ts"
Cm "feat(notifications): implement notifications service with socket events" "2026-03-01T11:25:00"

Rf "$B/src/modules/notifications/notifications.controller.ts"
Cm "feat(notifications): add notifications controller" "2026-03-01T11:45:00"

Rf "$B/src/modules/notifications/notifications.module.ts"
Cm "feat(notifications): wire notifications module" "2026-03-01T12:00:00"

# == Day 7: Mar 2 ==
Rf "$B/src/modules/admin/admin.service.ts"
Cm "feat(admin): implement admin service with dashboard stats" "2026-03-02T09:00:00"

Rf "$B/src/modules/admin/admin.controller.ts"
Cm "feat(admin): add admin controller with role-based access" "2026-03-02T09:25:00"

Rf "$B/src/modules/admin/admin.module.ts"
Cm "feat(admin): wire admin module" "2026-03-02T09:40:00"

Rf "$B/src/modules/webrtc/webrtc.gateway.ts"; Rf "$B/src/modules/webrtc/webrtc.module.ts"
Cm "feat(webrtc): add WebRTC signaling gateway for video calls" "2026-03-02T10:10:00"

Rf "$B/.env"; Rf "$B/.env.example"
Cm "chore(backend): add environment configuration" "2026-03-02T10:30:00"

Rf "$B/docker-compose.yml"
Cm "chore: add docker-compose with MongoDB service" "2026-03-02T10:50:00"

# == Day 8: Mar 3 ==
Rf "$F/.gitignore"; Rf "$F/package.json"; Rf "$F/package-lock.json"
Cm "chore(frontend): initialize React + Vite + TypeScript project" "2026-03-03T09:00:00"

Rf "$F/tsconfig.json"; Rf "$F/vite.config.ts"
Cm "chore(frontend): add TypeScript and Vite config with API proxy" "2026-03-03T09:20:00"

Rf "$F/index.html"; Rf "$F/src/main.tsx"; Rf "$F/src/index.css"; Rf "$F/public/vite.svg"; Rf "$F/src/typescript.svg"
Cm "feat(frontend): add HTML entry, main.tsx, and global styles" "2026-03-03T09:40:00"

Rf "$F/src/types/index.ts"
Cm "feat(frontend): add TypeScript type definitions" "2026-03-03T10:00:00"

Rf "$F/src/lib/api.ts"
Cm "feat(frontend): add axios API client with JWT interceptor" "2026-03-03T10:20:00"

Rf "$F/src/lib/constants.ts"
Cm "feat(frontend): add shared constants" "2026-03-03T10:35:00"

Rf "$F/src/context/AuthContext.tsx"
Cm "feat(frontend): add AuthContext with login/register/logout" "2026-03-03T11:00:00"

Rf "$F/src/context/SocketContext.tsx"
Cm "feat(frontend): add SocketContext for real-time events" "2026-03-03T11:25:00"

Rf "$F/src/components/common/ProtectedRoute.tsx"
Cm "feat(frontend): add ProtectedRoute component" "2026-03-03T11:45:00"

Rf "$F/src/components/layout/Navbar.tsx"
Cm "feat(frontend): add Navbar with navigation and auth state" "2026-03-03T12:05:00"

Rf "$F/src/components/layout/Layout.tsx"
Cm "feat(frontend): add Layout wrapper component" "2026-03-03T12:20:00"

# == Day 9: Mar 4 ==
Rf "$F/src/services/auth.service.ts"
Cm "feat(frontend): add auth service" "2026-03-04T09:00:00"

Rf "$F/src/services/users.service.ts"
Cm "feat(frontend): add users service" "2026-03-04T09:15:00"

Rf "$F/src/services/skills.service.ts"
Cm "feat(frontend): add skills service" "2026-03-04T09:30:00"

Rf "$F/src/services/sessions.service.ts"
Cm "feat(frontend): add sessions service" "2026-03-04T09:45:00"

Rf "$F/src/services/reviews.service.ts"
Cm "feat(frontend): add reviews service" "2026-03-04T10:00:00"

Rf "$F/src/services/credits.service.ts"
Cm "feat(frontend): add credits service" "2026-03-04T10:15:00"

Rf "$F/src/services/chat.service.ts"
Cm "feat(frontend): add chat service" "2026-03-04T10:30:00"

Rf "$F/src/services/notifications.service.ts"
Cm "feat(frontend): add notifications service" "2026-03-04T10:45:00"

Rf "$F/src/services/admin.service.ts"
Cm "feat(frontend): add admin service" "2026-03-04T11:00:00"

# == Day 10: Mar 5 ==
Rf "$F/src/pages/auth/LoginPage.tsx"
Cm "feat(frontend): add login page" "2026-03-05T09:00:00"

Rf "$F/src/pages/auth/RegisterPage.tsx"
Cm "feat(frontend): add register page" "2026-03-05T09:25:00"

Rf "$F/src/pages/dashboard/DashboardPage.tsx"
Cm "feat(frontend): add dashboard page with stats overview" "2026-03-05T09:55:00"

Rf "$F/src/App.tsx"
Cm "feat(frontend): add App component with routing" "2026-03-05T10:20:00"

# == Day 11: Mar 6 ==
Rf "$F/src/pages/skills/SkillsPage.tsx"
Cm "feat(frontend): add skills browsing page" "2026-03-06T09:00:00"

Rf "$F/src/pages/skills/SkillDetailPage.tsx"
Cm "feat(frontend): add skill detail page" "2026-03-06T09:30:00"

Rf "$F/src/pages/skills/MySkillsPage.tsx"
Cm "feat(frontend): add my skills management page" "2026-03-06T10:00:00"

Rf "$F/src/pages/users/UserDetailPage.tsx"
Cm "feat(frontend): add user detail page" "2026-03-06T10:30:00"

Rf "$F/src/pages/profile/ProfilePage.tsx"
Cm "feat(frontend): add profile page with stats and reviews" "2026-03-06T11:00:00"

# == Day 12: Mar 7 ==
Rf "$F/src/pages/sessions/SessionsPage.tsx"
Cm "feat(frontend): add sessions page with status management" "2026-03-07T09:00:00"

Rf "$F/src/pages/chat/ChatPage.tsx"
Cm "feat(frontend): add real-time chat page" "2026-03-07T09:35:00"

Rf "$F/src/pages/notifications/NotificationsPage.tsx"
Cm "feat(frontend): add notifications page with mark-as-read" "2026-03-07T10:10:00"

Rf "$F/src/pages/admin/AdminDashboardPage.tsx"
Cm "feat(frontend): add admin dashboard page" "2026-03-07T10:45:00"

# == Day 13: Mar 8 ==
Rf "$F/src/components/video/VideoRoom.tsx"
Cm "feat(frontend): add VideoRoom component with WebRTC" "2026-03-08T09:00:00"

Rf "$F/src/pages/sessions/VideoCallPage.tsx"
Cm "feat(frontend): add video call page" "2026-03-08T09:30:00"

Rf "$F/src/lib/useQuery.ts"
Cm "feat(frontend): add useQuery hook with caching and invalidation" "2026-03-08T10:15:00"

Rf "$F/src/lib/useMutation.ts"
Cm "feat(frontend): add useMutation hook with auto-invalidation" "2026-03-08T10:45:00"

# == Day 14: Mar 9 ==
Rf "$B/src/common/guards/jwt-auth.guard.ts"; Rf "$B/src/common/decorators/auth.decorator.ts"
Cm "feat(backend): add @Auth() decorator with role-based access" "2026-03-09T09:00:00"

Rf "$F/.env"
Cm "chore(frontend): add environment configuration" "2026-03-09T09:30:00"

# == Day 15: Mar 10 ==
Rf "$B/Dockerfile"; Rf "$B/.dockerignore"
Cm "feat(docker): add backend Dockerfile with multi-stage build" "2026-03-10T09:00:00"

Rf "$F/Dockerfile"; Rf "$F/.dockerignore"; Rf "$F/nginx.conf"
Cm "feat(docker): add frontend Dockerfile with nginx" "2026-03-10T09:30:00"

Write-Host "`nDone! Commit count:" -ForegroundColor Green
git log --oneline | Measure-Object -Line
