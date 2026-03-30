CREATE TABLE "socket_io_attachments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"payload" "bytea"
);
