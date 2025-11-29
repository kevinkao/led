-- CreateTable
CREATE TABLE `outages_groups` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event_type` VARCHAR(255) NOT NULL,
    `controller_id` VARCHAR(255) NOT NULL,
    `start_time` DATETIME(0) NOT NULL,
    `end_time` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_time_event_controller`(`start_time`, `end_time`, `event_type`, `controller_id`),
    INDEX `idx_event_controller`(`controller_id`, `event_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outages_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `group_id` BIGINT NOT NULL,
    `occurrence_time` DATETIME(0) NOT NULL,

    UNIQUE INDEX `idx_group_id_occurrence_time`(`group_id`, `occurrence_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
