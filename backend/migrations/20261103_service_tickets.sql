-- Additive support workflow, ISO/IEC 20000-1 aligned practices, not certification.
-- DATETIME values are UTC. 24x7 elapsed clocks, including pending.
-- These SLA targets are local examples, NOT values mandated by ISO.
CREATE TABLE IF NOT EXISTS ticket_sla_policies (
 priority VARCHAR(2) PRIMARY KEY,
 response_minutes BIGINT UNSIGNED NOT NULL,
 resolution_minutes BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO ticket_sla_policies (priority,response_minutes,resolution_minutes) VALUES
 ('P1',15,240),('P2',60,480),('P3',240,1440),('P4',480,4320);
CREATE TABLE IF NOT EXISTS service_tickets (
 ticket_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(200) NOT NULL,
 description TEXT NOT NULL,
 type ENUM('incident','service_request') NOT NULL,
 category ENUM('hardware','software','network','account','other') NOT NULL,
 impact ENUM('high','medium','low') NOT NULL,
 urgency ENUM('high','medium','low') NOT NULL,
 priority ENUM('P1','P2','P3','P4') NOT NULL,
 status ENUM('new','assigned','in_progress','pending','resolved','closed','cancelled') NOT NULL DEFAULT 'new',
 reporter_id INT NOT NULL,
 assignee_id INT NULL,
 perangkat_id INT NULL,
 pengecekan_id INT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 response_minutes BIGINT UNSIGNED NOT NULL,
 resolution_minutes BIGINT UNSIGNED NOT NULL,
 created_at DATETIME(3) NOT NULL,
 updated_at DATETIME(3) NOT NULL,
 first_response_at DATETIME(3) NULL,
 response_due_at DATETIME(3) NOT NULL,
 resolution_due_at DATETIME(3) NOT NULL,
 resolved_at DATETIME(3) NULL,
 closed_at DATETIME(3) NULL,
 cancelled_at DATETIME(3) NULL,
 escalated_at DATETIME(3) NULL,
 resolution TEXT NULL,
 root_cause TEXT NULL,
 response_breached BOOLEAN NOT NULL DEFAULT FALSE,
 resolution_breached BOOLEAN NOT NULL DEFAULT FALSE,
 UNIQUE KEY uq_ticket_pengecekan (pengecekan_id),
 KEY idx_ticket_reporter (reporter_id),
 KEY idx_ticket_assignee (assignee_id),
 KEY idx_ticket_status_priority (status,priority),
 KEY idx_ticket_device (perangkat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ticket_events (
 event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ticket_id INT NOT NULL,
 action VARCHAR(32) NOT NULL,
 from_status VARCHAR(20) NULL,
 to_status VARCHAR(20) NULL,
 note TEXT NOT NULL,
 actor_id INT NOT NULL,
 created_at DATETIME(3) NOT NULL,
 KEY idx_ticket_event (ticket_id,event_id),
 CONSTRAINT fk_ticket_event_ticket FOREIGN KEY (ticket_id) REFERENCES service_tickets(ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ticket_policy_events (
 event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 actor_id INT NOT NULL,
 note TEXT NOT NULL,
 policies_json JSON NOT NULL,
 created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- No legacy foreign keys or state writes: the explicit import bridge does not
-- synchronize equipment repair completion with ticket resolution/verification.
