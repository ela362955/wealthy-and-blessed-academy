CREATE TABLE `lifeStageExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordDate` timestamp NOT NULL DEFAULT (now()),
	`stage` enum('1','2','3','4','5','6') NOT NULL,
	`currentAge` int NOT NULL,
	`stageAgeRange` varchar(20),
	`lifeDescription` text,
	`mindsetDescription` text,
	`expenses` json NOT NULL,
	`monthlyTotal` decimal(12,2) NOT NULL,
	`yearlyTotal` decimal(12,2) NOT NULL,
	`requiredNetAsset` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lifeStageExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lifestyleExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordDate` timestamp NOT NULL DEFAULT (now()),
	`personType` enum('self','partner') NOT NULL,
	`lifestyles` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lifestyleExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `netWorthTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordDate` timestamp NOT NULL,
	`assets` json NOT NULL,
	`liabilities` json NOT NULL,
	`totalAssets` decimal(15,2) NOT NULL,
	`totalLiabilities` decimal(15,2) NOT NULL,
	`netWorth` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `netWorthTracking_id` PRIMARY KEY(`id`)
);
