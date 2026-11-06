-- Exactly these four regulated document classes constitute an eligible driver.
ALTER TABLE ride_driver_documents ADD CONSTRAINT ride_driver_document_kind_check
 CHECK(document_kind IN ('licence','identification','insurance','vehicle_registration'));
