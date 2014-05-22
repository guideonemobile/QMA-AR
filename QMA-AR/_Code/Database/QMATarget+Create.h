
#import "QMATarget.h"


@interface QMATarget (Create)

+ (QMATarget *)targetWithName:(NSString *)name
       inManagedObjectContext:(NSManagedObjectContext *)moc;

@end
