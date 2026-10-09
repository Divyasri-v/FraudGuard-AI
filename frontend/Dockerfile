FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173

# Configure nginx to serve on port 5173 and support SPA routing
RUN sed -i 's/listen       80;/listen       5173;/' /etc/nginx/conf.d/default.conf && \
    sed -i 's/location \/ {/location \/ { try_files $uri $uri\/ \/index.html;/' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
