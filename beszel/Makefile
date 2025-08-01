# Default OS/ARCH values
OS ?= $(shell go env GOOS)
ARCH ?= $(shell go env GOARCH)
# Skip building the web UI if true
SKIP_WEB ?= false

# Set executable extension based on target OS
EXE_EXT := $(if $(filter windows,$(OS)),.exe,)

.PHONY: tidy build-agent build-hub build clean lint dev-server dev-agent dev-hub dev generate-locales
.DEFAULT_GOAL := build

clean:
	go clean
	rm -rf ./build

lint:
	golangci-lint run

test: export GOEXPERIMENT=synctest
test:
	go test -tags=testing ./...

tidy:
	go mod tidy

build-web-ui:
	@if command -v bun >/dev/null 2>&1; then \
		bun install --cwd ./site && \
		bun run --cwd ./site build; \
	else \
		npm install --prefix ./site && \
		npm run --prefix ./site build; \
	fi

# Conditional .NET build - only for Windows
build-dotnet-conditional:
	@if [ "$(OS)" = "windows" ]; then \
		echo "Building .NET executable for Windows..."; \
		if command -v dotnet >/dev/null 2>&1; then \
			rm -rf ./internal/agent/lhm/bin; \
			dotnet build -c Release ./internal/agent/lhm/beszel_lhm.csproj; \
		else \
			echo "Error: dotnet not found. Install .NET SDK to build Windows agent."; \
			exit 1; \
		fi; \
	fi

# Update build-agent to include conditional .NET build
build-agent: tidy build-dotnet-conditional
	GOOS=$(OS) GOARCH=$(ARCH) go build -o ./build/beszel-agent_$(OS)_$(ARCH)$(EXE_EXT) -ldflags "-w -s" beszel/cmd/agent

build-hub: tidy $(if $(filter false,$(SKIP_WEB)),build-web-ui)
	GOOS=$(OS) GOARCH=$(ARCH) go build -o ./build/beszel_$(OS)_$(ARCH)$(EXE_EXT) -ldflags "-w -s" beszel/cmd/hub

build: build-agent build-hub

generate-locales:
	@if [ ! -f ./site/src/locales/en/en.ts ]; then \
		echo "Generating locales..."; \
		command -v bun >/dev/null 2>&1 && cd ./site && bun install && bun run sync || cd ./site && npm install && npm run sync; \
	fi

dev-server: generate-locales
	cd ./site
	@if command -v bun >/dev/null 2>&1; then \
		cd ./site && bun run dev --host 0.0.0.0; \
	else \
		cd ./site && npm run dev --host 0.0.0.0; \
	fi

dev-hub: export ENV=dev
dev-hub:
	mkdir -p ./site/dist && touch ./site/dist/index.html
	@if command -v entr >/dev/null 2>&1; then \
		find ./cmd/hub/*.go ./internal/{alerts,hub,records,users}/*.go | entr -r -s "cd ./cmd/hub && go run . serve --http 0.0.0.0:8090"; \
	else \
		cd ./cmd/hub && go run . serve --http 0.0.0.0:8090; \
	fi

dev-agent:
	@if command -v entr >/dev/null 2>&1; then \
		find ./cmd/agent/*.go ./internal/agent/*.go | entr -r go run beszel/cmd/agent; \
	else \
		go run beszel/cmd/agent; \
	fi
	
build-dotnet:
	@if command -v dotnet >/dev/null 2>&1; then \
		rm -rf ./internal/agent/lhm/bin; \
		dotnet build -c Release ./internal/agent/lhm/beszel_lhm.csproj; \
	else \
		echo "dotnet not found"; \
	fi


# KEY="..." make -j dev
dev: dev-server dev-hub dev-agent
