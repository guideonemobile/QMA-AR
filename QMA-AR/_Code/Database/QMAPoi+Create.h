
#import "QMAPoi.h"


@interface QMAPoi (Create)

+ (QMAPoi *)poiWithName:(NSString *)name
         andOrderNumber:(NSNumber *)order
 inManagedObjectContext:(NSManagedObjectContext *)moc;

@end
